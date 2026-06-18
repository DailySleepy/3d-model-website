import * as THREE from 'three/webgpu'
import * as tsl from 'three/tsl'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { disposeScene } from '../utils.js'
import { CompilerContext } from './compiler.js'

export class ShaderGraphEngine {
  constructor() {
    // Core
    this.renderer = null
    this.scene = null
    this.camera = null
    this.controls = null
    this.timer = null

    // Context
    this.container = null
    this.resizeListener = null

    // Config
    this.particleCount = null
    this.selectedGeometry = null
    this.customModelUrl = null

    // Render Target
    this.geometries = null
    this.instancedMesh = null

    // Buffers
    this.positionAttribute = null
    this.positionBuffer = null
    this.velocityAttribute = null
    this.velocityBuffer = null

    // Uniforms
    this.lightDirUniform = null
    this.timeUniform = new THREE.UniformNode(0.0);
    this.deltaTimeUniform = new THREE.UniformNode(0.0);

    // Shader Terminal
    this.material = null
    this.simulationKernel = null
  }

  /**
   * 初始化引擎
   * @param {HTMLElement} container - 挂载的 3D 渲染 DOM 容器
   * @param {Object} [options={}] - 可选的配置参数对象
   * @param {number} [options.particleCount] - 粒子总数
   * @param {'sphere'|'box'|'cylinder'|'torus'|'plane'|'custom'} [options.selectedGeometry] - 初始几何体形状
   * @param {string|null} [options.customModelUrl] - 自定义 GLTF 模型的网络或本地 URL 地址（仅在 selectedGeometry 为 'custom' 时生效）
   */
  init(container, options = {}) {
    const {
      particleCount = 1,
      selectedGeometry = 'sphere',
      customModelUrl = null,
    } = options

    this.container = container
    this.particleCount = particleCount
    this.selectedGeometry = selectedGeometry
    this.customModelUrl = customModelUrl

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100)
    this.camera.position.set(0, 15, 25)

    this.renderer = new THREE.WebGPURenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    // 在显存中分配 particleCount * 3 长度的 Float32Array 用于存储每个粒子的位置和速度, 并转换成 storage 节点
    this.#allocateBuffers()

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight.position.set(10, 10, 10)
    this.scene.add(dirLight)

    this.geometries = {
      sphere: new THREE.SphereGeometry(0.15, 16, 16),
      box: new THREE.BoxGeometry(0.2, 0.2, 0.2),
      cylinder: new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16),
      torus: new THREE.TorusGeometry(0.15, 0.05, 8, 24),
      plane: new THREE.PlaneGeometry(0.3, 0.3, 1, 1)
    }

    // 创建实例化节点材质, 并初始化材质坐标节点
    this.material = new THREE.MeshStandardNodeMaterial({ roughness: 0.1, metalness: 0.1 })
    this.material.positionNode = tsl.positionLocal.add(this.positionBuffer.toAttribute())

    // 在 scene & material 初始化完成后, 初始化 InstancedMesh
    this.updateGeometry(selectedGeometry, customModelUrl)

    this.timer = new THREE.Timer()
    this.timer.getDelta()

    this.renderer.setAnimationLoop(() => { // TODO: vs. requestAnimationFrame()
      let delteTime = this.timer.getDelta()
      if (delteTime > 0.05) delteTime = 0.05

      this.deltaTimeUniform.value = delteTime
      this.timeUniform.value += delteTime

      this.controls.update()

      if (this.simulationKernel) {
        this.renderer.compute(this.simulationKernel)
      }
      this.renderer.render(this.scene, this.camera)
    })

    this.resizeListener = () => {
      if (this.container && this.camera && this.renderer) {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      }
    }
    window.addEventListener('resize', this.resizeListener)
  }

  destroy() {
    // Core & Context
    if (this.renderer) {
      this.renderer.setAnimationLoop(null)
      let carvas = this.renderer.domElement
      if (carvas) {
        carvas.remove()
      }
      this.renderer.dispose()
      this.renderer = null
    }
    if (this.controls) {
      this.controls.dispose()
      this.controls = null
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener)
      this.resizeListener = null
    }
    if (this.container) {
      this.container = null
    }

    // Scene & Instanced Mesh & Graph Root Node
    if (this.scene) {
      disposeScene(this.scene)
      this.scene = null
    }
    if (this.simulationKernel) {
      this.simulationKernel.dispose()
      this.simulationKernel = null
    }

    // Buffers
    this.#clearBuffers()

    // Render Target
    if (this.geometries) {
      Object.values(this.geometries).forEach(geom => geom.dispose())
      this.geometries = null
    }
  }

  resize() {
    if (this.resizeListener) {
      this.resizeListener()
    }
  }

  async loadCustomGeometry(url) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)

    // 应用变换并简化模型(只提取normal/position/index)
    // ERROR: lack of uv and material
    // TODO: 放弃合并，保留层级架构
    const geometryArray = []
    gltf.scene.updateMatrixWorld(true)

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        const geom = child.geometry.clone()
        geom.applyMatrix4(child.matrixWorld)

        if (!geom.getAttribute('normal')) {
          geom.computeVertexNormals()
        }
        const clean = new THREE.BufferGeometry()
        for (const attributeName of ['position', 'normal']) {
          clean.setAttribute(attributeName, geom.getAttribute(attributeName))
        }
        if (geom.index) {
          clean.setIndex(geom.index)
        }

        geometryArray.push(clean)
      }
    })

    if (geometryArray.length > 0) {
      try {
        const merged = BufferGeometryUtils.mergeGeometries(geometryArray, true)
        merged.computeBoundingBox()
        const size = merged.boundingBox.getSize(new THREE.Vector3()).length()
        const scale = 0.4 / (size || 1) // TODO: scale model or change fov
        merged.scale(scale, scale, scale)
        merged.center()
        return merged
      } catch (err) {
        console.error("Failed to merge geometries, falling back to first child mesh geometry:", err)
        return geometryArray[0]
      }
    } else {
      return new THREE.SphereGeometry(0.15, 16, 16)
    }
  }

  async updateGeometry(selectedGeometry, customModelUrl = null) {
    if (!this.scene || !this.material) return

    this.selectedGeometry = selectedGeometry
    this.customModelUrl = customModelUrl

    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh)
      this.instancedMesh.dispose()
    }

    let geometry
    if (this.selectedGeometry == 'custom' && this.customModelUrl) {
      geometry = await this.loadCustomGeometry(this.customModelUrl)
    } else {
      geometry = (this.geometries[this.selectedGeometry] || this.geometries.sphere).clone()
    }
    geometry.setAttribute('positionAttribute', this.positionAttribute)
    geometry.setAttribute('velocityAttribute', this.velocityAttribute)
    this.instancedMesh = new THREE.InstancedMesh(geometry, this.material, this.particleCount)
    this.scene.add(this.instancedMesh)
  }

  async updateParticleCount(newCount, simNodes, simEdges, matNodes, matEdges) {
    if (this.particleCount === newCount) return
    this.particleCount = newCount

    this.#clearBuffers()
    this.#allocateBuffers()

    this.material.positionNode = tsl.positionLocal.add(this.positionBuffer)

    await this.updateGeometry(this.selectedGeometry, this.customModelUrl)

    if (simNodes && simEdges) this.compileSimulation(simNodes, simEdges)
    if (matNodes && matEdges) this.compileMaterial(matNodes, matEdges)
  }

  async resetParticleBuffers(simNodes, simEdges) {
    if (!this.renderer || !this.#checkBuffers()) return

    const ctx = new CompilerContext(simNodes, simEdges)
    const fetchInput = ctx.createInputFetcher('sim-output')
    if (!fetchInput) return

    const initPos = fetchInput('init-position')
    const initVel = fetchInput('init-velocity')

    const initKernelFn = tsl.Fn(() => {
      this.positionBuffer.element(tsl.instanceIndex).assign(initPos)
      this.velocityBuffer.element(tsl.instanceIndex).assign(initVel)
    })

    // 使用 computeAsync 替代 compute 解决 backend 初始化前的警告
    this.renderer.computeAsync(tsl.compute(initKernelFn(), this.particleCount))
  }

  compileSimulation(simNodes, simEdges) {
    console.log("try to compile Simulation")
    if (!this.positionBuffer || !this.velocityBuffer) return

    const ctx = new CompilerContext(simNodes, simEdges, {
      lightDir: this.lightDirUniform,
      time: this.timeUniform
    })
    const fetchInput = ctx.createInputFetcher('sim-output')
    if (!fetchInput) return

    const initPos = fetchInput('init-position')
    const initVel = fetchInput('init-velocity')
    const inputVel = fetchInput('velocity')
    const inputForce = fetchInput('force')

    const computeSimulationKernelFn = tsl.Fn(() => {
      const currentPos = this.positionBuffer.element(tsl.instanceIndex)
      const currentVel = this.velocityBuffer.element(tsl.instanceIndex)

      const nextVel = inputVel.add(currentVel.add(inputForce.mul(this.deltaTimeUniform)))
      const nextPos = currentPos.add(nextVel.mul(this.deltaTimeUniform))

      const isDead = tsl.bool(false) // TODO

      this.positionBuffer.element(tsl.instanceIndex).assign(tsl.select(isDead, initPos, nextPos))
      this.velocityBuffer.element(tsl.instanceIndex).assign(tsl.select(isDead, initVel, nextVel))
    })

    this.simulationKernel = tsl.compute(computeSimulationKernelFn(), this.particleCount)
    this.resetParticleBuffers(simNodes, simEdges)

    console.log("finished compile Simulation")
  }

  compileMaterial(matNodes, matEdges) {
    console.log("try to compile Material")

    const ctx = new CompilerContext(matNodes, matEdges, {
      lightDir: this.lightDirUniform,
      time: this.timeUniform
    })
    const fetchInput = ctx.createInputFetcher('mat-output')
    if (!fetchInput) return

    this.material.colorNode = fetchInput('in-color')
    this.material.roughnessNode = fetchInput('in-roughness')
    this.material.metalnessNode = fetchInput('in-metalness')
    this.material.emissiveNode = fetchInput('in-emissive')
    this.material.aoNode = fetchInput('in-ao')
    this.material.normalNode = fetchInput('in-normal')

    const userVertexDeformation = fetchInput('in-position')
    let pos = tsl.positionLocal.add(this.positionBuffer.toAttribute())
    if (userVertexDeformation) pos = pos.add(userVertexDeformation)
    this.material.positionNode = pos
    this.material.needsUpdate = true

    console.log("finished compile Material")
  }

  #clearBuffers() {
    if (this.positionAttribute) {
      this.positionAttribute.dispose()
      this.positionAttribute = null
      this.positionBuffer = null
    }
    if (this.velocityAttribute) {
      this.velocityAttribute.dispose()
      this.velocityAttribute = null
      this.velocityBuffer = null
    }
  }

  #allocateBuffers() {
    console.log("allocate Buffers")
    this.positionAttribute = new THREE.StorageInstancedBufferAttribute(new Float32Array(this.particleCount * 3), 3)
    this.positionBuffer = new THREE.StorageBufferNode(this.positionAttribute, 'vec3', this.particleCount)

    this.velocityAttribute = new THREE.StorageInstancedBufferAttribute(new Float32Array(this.particleCount * 3), 3)
    this.velocityBuffer = new THREE.StorageBufferNode(this.velocityAttribute, 'vec3', this.particleCount)
  }

  #checkBuffers() {
    return this.positionBuffer != null && this.velocityBuffer != null
  }
}
