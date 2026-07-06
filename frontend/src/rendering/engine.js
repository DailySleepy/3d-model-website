import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as tsl from 'three/tsl'
import * as THREE from 'three/webgpu'
import { disposeScene } from './utils.js'
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
    this.mode = 'particle' // 'particle'  | 'classic'

    // Scene Objects & Animation
    this.geometries = null
    this.instancedMeshes = []
    this.classicModel = null
    this.mixer = null

    // Buffers
    this.positionAttribute = null
    this.positionBuffer = null
    this.velocityAttribute = null
    this.velocityBuffer = null

    // Uniforms
    this.lightDirUniform = new THREE.UniformNode(new THREE.Vector3(10, 10, 10).normalize())
    this.timeUniform = new THREE.UniformNode(0.0)
    this.deltaTimeUniform = new THREE.UniformNode(0.0)

    // Shader Terminal
    this.simulationKernel = null

    // FPS
    this.fpsCallback = null
    this.frameCount = 0
    this.lastFpsUpdate = 0
    this.accumulatedRenderTime = 0
  }

  /**
   * 初始化引擎
   * @param {HTMLElement} container - 挂载的 3D 渲染 DOM 容器
   * @param {Object} [options={}] - 可选的配置参数对象
   * @param {number} [options.particleCount] - 粒子总数
   * @param {'sphere'|'box'|'cylinder'|'torus'|'plane'|'custom'} [options.selectedGeometry] - 初始几何体形状
   * @param {string|null} [options.customModelUrl] - 自定义 GLTF 模型的网络或本地 URL 地址（仅在 selectedGeometry 为 'custom' 时生效）
   * @param {'particle'|'classic'} [options.mode] - 渲染模式
   * @param {function(number): void} [options.onProgress] - 进度回调函数
   */
  async init(container, options = {}) {
    const {
      particleCount = 1,
      selectedGeometry = 'sphere',
      customModelUrl = null,
      mode = 'classic',
      onProgress = null
    } = options

    this.container = container
    this.particleCount = particleCount
    this.selectedGeometry = selectedGeometry
    this.customModelUrl = customModelUrl
    this.mode = mode

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#121212')
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 1000)
    this.camera.position.z = 2

    this.renderer = new THREE.WebGPURenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true

    // 在显存中分配 particleCount * 3 长度的 Float32Array 用于存储每个粒子的位置和速度, 并转换成 storage 节点
    if (this.mode === 'particle') {
      this.#allocateBuffers()
    }

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

    await this.updateGeometry(selectedGeometry, customModelUrl, onProgress)

    this.timer = new THREE.Timer()
    this.timer.getDelta()

    this.startLoop()

    this.resizeListener = () => {
      if (this.container && this.camera && this.renderer) {
        const width = this.container.clientWidth
        const height = this.container.clientHeight
        if (width > 0 && height > 0) {
          this.camera.aspect = width / height
          this.camera.updateProjectionMatrix()
          this.renderer.setSize(width, height)
        }
      }
    }
    window.addEventListener('resize', this.resizeListener)
  }

  startLoop() {
    if (!this.renderer) return

    this.frameCount = 0
    this.lastFpsUpdate = performance.now()
    this.accumulatedRenderTime = 0

    this.renderer.setAnimationLoop(() => {
      let frameStart = 0
      if (this.fpsCallback) {
        frameStart = performance.now()
      }

      this.timer.update()
      let deltaTime = this.timer.getDelta()
      if (deltaTime > 0.05) deltaTime = 0.05

      this.deltaTimeUniform.value = deltaTime
      this.timeUniform.value += deltaTime

      this.controls.update()

      if (this.mode === 'particle' && this.simulationKernel) {
        this.renderer.compute(this.simulationKernel)
      }

      if (this.mode === 'classic' && this.mixer) {
        this.mixer.update(deltaTime)
      }

      this.renderer.render(this.scene, this.camera)

      if (this.fpsCallback) {
        this.#recordFrameTime(frameStart, true)
      }
    })
  }

  #recordFrameTime(frameStart, useGpu = false) {
    if (!this.fpsCallback) return

    const record = () => {
      if (!this.fpsCallback) return
      const frameCost = performance.now() - frameStart
      this.accumulatedRenderTime += frameCost
      this.frameCount++

      const now = performance.now()
      if (now - this.lastFpsUpdate >= 1000) {
        const calculatedFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate))
        const averageMs = this.accumulatedRenderTime / this.frameCount
        this.frameCount = 0
        this.accumulatedRenderTime = 0
        this.lastFpsUpdate = now

        // 使用帧间隔（1000/FPS）作为上限进行裁剪：当 GPU 满载掉帧时，队列积压会导致 measuredLatency 虚高。
        // 此时真实的单帧渲染工作开销等于帧输出间隔。此限制可消除积压误差并自适应所有屏幕刷新率。
        const frameInterval = calculatedFps > 0 ? (1000 / calculatedFps) : 0
        const finalMs = calculatedFps > 0 ? Math.min(averageMs, frameInterval) : averageMs
        this.fpsCallback({ fps: calculatedFps, ms: parseFloat(finalMs.toFixed(1)) })
      }
    }

    if (useGpu) {
      const device = this.renderer && this.renderer.backend && this.renderer.backend.device
      if (device) {
        device.queue.onSubmittedWorkDone().then(record)
        return
      }
    }

    record()
  }

  stopLoop() {
    if (this.renderer) {
      this.renderer.setAnimationLoop(null)
    }
  }

  destroy() {
    // Core & Context
    if (this.renderer) {
      this.stopLoop()
      let canvas = this.renderer.domElement
      if (canvas) {
        canvas.remove()
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

    // Scene Objects & Animation
    if (this.scene) {
      disposeScene(this.scene)
      this.scene = null
    }
    this.instancedMeshes = []
    this.classicModel = null
    if (this.geometries) {
      Object.values(this.geometries).forEach(geom => geom.dispose())
      this.geometries = null
    }
    if (this.mixer) {
      this.mixer.stopAllAction()
      this.mixer = null
    }

    // Shader Terminal
    if (this.simulationKernel) {
      this.simulationKernel.dispose()
      this.simulationKernel = null
    }

    // Buffers
    this.#clearBuffers()
  }

  resize() {
    if (this.resizeListener) {
      this.resizeListener()
    }
  }

  fitCameraToObject(object) {
    if (!this.camera || !this.controls) return
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

    this.camera.position.set(0, size.y / 2, cameraZ * 1.8)
    this.controls.target.copy(center)
    this.controls.update()
  }

  // 加载多子 Mesh 模型, 为各 Mesh 创建共享物理 Buffer 的 InstancedMesh 粒子
  async loadInstancedModel(url, count, loadId, onProgress) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url, onProgress)

    if (loadId !== undefined && loadId !== this.currentLoadId) {
      disposeScene(gltf.scene)
      return
    }

    const root = gltf.scene
    root.updateMatrixWorld(true)

    root.traverse((child) => {
      if (child.isMesh) {
        // 静态预变换 geometry 顶点到世界空间坐标, 消除多层级位移的拼合对齐问题
        const geom = child.geometry.clone()
        geom.applyMatrix4(child.matrixWorld)

        geom.setAttribute('positionAttribute', this.positionAttribute)
        geom.setAttribute('velocityAttribute', this.velocityAttribute)

        const nodeMat = this.#buildNodeMaterial(child.material)
        // 在顶点着色器中绑定共享粒子位置偏移
        if (this.positionBuffer) {
          nodeMat.positionNode = tsl.positionLocal.add(this.positionBuffer.toAttribute())
        }

        const instMesh = new THREE.InstancedMesh(geom, nodeMat, count)
        this.scene.add(instMesh)
        this.instancedMeshes.push(instMesh)
      }
    })

    this.fitCameraToObject(root)
  }

  // 直接加载层级模型
  async loadClassicModel(url, loadId, onProgress) {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url, onProgress)

    if (loadId !== undefined && loadId !== this.currentLoadId) {
      disposeScene(gltf.scene)
      return
    }

    const root = gltf.scene

    root.traverse((child) => {
      if (child.isMesh) {
        child.material = this.#buildNodeMaterial(child.material)
      }
    })

    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(root)
      const action = this.mixer.clipAction(gltf.animations[0])
      action.play()
    }

    this.scene.add(root)
    this.classicModel = root

    this.fitCameraToObject(this.classicModel)
  }

  async updateGeometry(selectedGeometry, customModelUrl = null, onProgress = null) {
    if (!this.scene) return

     // 通过 loadId 避免并发加载导致的资源混乱
    this.currentLoadId = (this.currentLoadId || 0) + 1
    const loadId = this.currentLoadId

    this.selectedGeometry = selectedGeometry
    this.customModelUrl = customModelUrl

    // 动态根据当前的渲染模式，按需分配或清理粒子缓冲
    if (this.mode === 'particle') {
      if (!this.positionAttribute) {
        this.#allocateBuffers()
      }
    }
    else {
      this.#clearBuffers()
    }

    this.#clearCurrentGeometry()

    if (this.mode === 'classic') {
      if (this.selectedGeometry === 'custom' && this.customModelUrl) {
        await this.loadClassicModel(this.customModelUrl, loadId, onProgress)
      }
      else {
        const geom = (this.geometries[this.selectedGeometry] || this.geometries.sphere).clone()
        const nodeMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0.0 })
        const mesh = new THREE.Mesh(geom, nodeMat)
        this.scene.add(mesh)
        this.classicModel = mesh
      }
    }
    else { // particle
      if (this.selectedGeometry === 'custom' && this.customModelUrl) {
        await this.loadInstancedModel(this.customModelUrl, this.particleCount, loadId, onProgress)
      }
      else {
        const geom = (this.geometries[this.selectedGeometry] || this.geometries.sphere).clone()

        geom.setAttribute('positionAttribute', this.positionAttribute)
        geom.setAttribute('velocityAttribute', this.velocityAttribute)

        const nodeMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.5, metalness: 0.0 })
        if (this.positionBuffer) {
          nodeMat.positionNode = tsl.positionLocal.add(this.positionBuffer.toAttribute())
        }

        const instMesh = new THREE.InstancedMesh(geom, nodeMat, this.particleCount)
        this.scene.add(instMesh)
        this.instancedMeshes.push(instMesh)
      }
    }
  }

  /**会自动调用 updateGeometry 以按照新的粒子数量重新实例化 Mesh */
  async updateParticleCount(newCount, simNodes, simEdges, matNodes, matEdges, onProgress = null) {
    if (this.particleCount === newCount) return
    this.particleCount = newCount

    this.#clearBuffers()
    this.#allocateBuffers()

    await this.updateGeometry(this.selectedGeometry, this.customModelUrl, onProgress)

    // 节点图可能使用了粒子数量, 故需要重新编译, 也可以选择通过传入 null 来跳过编译
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

  compileSimulation(simNodes, simEdges, texturesMap = {}) {
    if (!this.positionBuffer || !this.velocityBuffer) return

    const ctx = new CompilerContext(simNodes, simEdges, {
      lightDir: this.lightDirUniform,
      time: this.timeUniform,
      textures: texturesMap
    })
    const fetchInput = ctx.createInputFetcher('sim-output')
    if (!fetchInput) return

    const initPos = fetchInput('init-position')
    const initVel = fetchInput('init-velocity')
    const inputVel = fetchInput('velocity')
    const inputForce = fetchInput('force')

    const outputNode = simNodes.find(n => n.type === 'sim-output')
    const isVelConnected = simEdges.some(edge => edge.target === outputNode?.id && edge.targetHandle === 'velocity')

    const computeSimulationKernelFn = tsl.Fn(() => {
      const currentPos = this.positionBuffer.element(tsl.instanceIndex)
      const currentVel = this.velocityBuffer.element(tsl.instanceIndex)

      const baseVel = isVelConnected ? inputVel : currentVel
      const nextVel = baseVel.add(inputForce.mul(this.deltaTimeUniform))
      const nextPos = currentPos.add(nextVel.mul(this.deltaTimeUniform))

      const isDead = tsl.bool(false) // TODO

      this.positionBuffer.element(tsl.instanceIndex).assign(tsl.select(isDead, initPos, nextPos))
      this.velocityBuffer.element(tsl.instanceIndex).assign(tsl.select(isDead, initVel, nextVel))
    })

    this.simulationKernel = tsl.compute(computeSimulationKernelFn(), this.particleCount)
    this.resetParticleBuffers(simNodes, simEdges)
  }

  compileMaterial(matNodes, matEdges, texturesMap = {}) {
    const ctx = new CompilerContext(matNodes, matEdges, {
      lightDir: this.lightDirUniform,
      time: this.timeUniform,
      textures: texturesMap
    })
    const fetchInput = ctx.createInputFetcher('mat-output')
    if (!fetchInput) return

    const inColor = fetchInput('in-color')
    const inRoughness = fetchInput('in-roughness')
    const inMetalness = fetchInput('in-metalness')
    const inEmissive = fetchInput('in-emissive')
    const inAO = fetchInput('in-ao')
    const inNormal = fetchInput('in-normal')
    const userVertexDeformation = fetchInput('in-position')

    const applyToMaterial = (material) => {
      material.colorNode = inColor || null
      material.roughnessNode = inRoughness || null
      material.metalnessNode = inMetalness || null
      material.emissiveNode = inEmissive || null
      material.normalNode = inNormal || null
      material.aoNode = inAO || null

      let pos = null
      if (this.mode === 'particle' && this.positionBuffer) {
        pos = tsl.positionLocal.add(this.positionBuffer.toAttribute())
      }
      if (userVertexDeformation) {
        pos = (pos || tsl.positionLocal).add(userVertexDeformation)
      }
      material.positionNode = pos

      material.needsUpdate = true
    }

    if (this.mode === 'classic' && this.classicModel) {
      this.classicModel.traverse((child) => {
        if (child.isMesh && child.material) {
          applyToMaterial(child.material)
        }
      })
    }
    else if (this.mode === 'particle' && this.instancedMeshes && this.instancedMeshes.length > 0) {
      this.instancedMeshes.forEach(mesh => {
        if (mesh.material) {
          applyToMaterial(mesh.material)
        }
      })
    }
  }

  resetCamera() {
    if (this.camera && this.controls) {
      this.camera.position.set(0, 0, 2)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
    }
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
    this.positionAttribute = new THREE.StorageInstancedBufferAttribute(new Float32Array(this.particleCount * 3), 3)
    this.positionBuffer = new THREE.StorageBufferNode(this.positionAttribute, 'vec3', this.particleCount)

    this.velocityAttribute = new THREE.StorageInstancedBufferAttribute(new Float32Array(this.particleCount * 3), 3)
    this.velocityBuffer = new THREE.StorageBufferNode(this.velocityAttribute, 'vec3', this.particleCount)
  }

  #checkBuffers() {
    return this.positionBuffer != null && this.velocityBuffer != null
  }

  #buildNodeMaterial(originalMat) {
    return new THREE.MeshStandardNodeMaterial({
      roughness: originalMat.roughness ?? 0.0,
      metalness: originalMat.metalness ?? 0.0,
      color: originalMat.color ? originalMat.color.clone() : new THREE.Color('#ffffff'),
      map: originalMat.map || null,
      roughnessMap: originalMat.roughnessMap || null,
      metalnessMap: originalMat.metalnessMap || null,
      emissive: originalMat.emissive ? originalMat.emissive.clone() : new THREE.Color('#000000'),
      emissiveMap: originalMat.emissiveMap || null,
      normalMap: originalMat.normalMap || null,
      aoMap: originalMat.aoMap || null,
    })
  }

  #clearCurrentGeometry() {
    if (this.instancedMeshes && this.instancedMeshes.length > 0) {
      this.instancedMeshes.forEach(mesh => {
        disposeScene(mesh)
      })
      this.instancedMeshes = []
    }

    if (this.classicModel) {
      disposeScene(this.classicModel)
      this.classicModel = null
    }
    if (this.mixer) {
      this.mixer.stopAllAction()
      this.mixer = null
    }
  }

  getCompiledWGSL() {
    const pipelines = this.renderer ? (this.renderer.pipelines || this.renderer._pipelines) : null
    if (!pipelines) {
      return { error: '渲染器未初始化或 Pipelines 未就绪' }
    }

    const programs = pipelines.programs
    const result = {
      vertex: [],
      fragment: [],
      compute: []
    }

    let simComputeShader = null
    if (this.simulationKernel && this.renderer._nodes) {
      const simState = this.renderer._nodes.get(this.simulationKernel)?.nodeBuilderState
      if (simState) {
        simComputeShader = simState.computeShader
      }
    }

    let matVertexShader = null
    let matFragmentShader = null
    if (this.renderer._nodes && this.renderer._nodes.nodeBuilderCache) {
      for (const state of this.renderer._nodes.nodeBuilderCache.values()) {
        if (state.vertexShader && (state.vertexShader.includes('positionAttribute') || state.vertexShader.includes('positionBuffer'))) {
          matVertexShader = state.vertexShader
          matFragmentShader = state.fragmentShader
          break
        }
      }
    }

    if (programs) {
      for (const [code, stage] of programs.vertex.entries()) {
        const isOurShader = code === matVertexShader
        result.vertex.push({
          name: isOurShader ? 'ShaderGraphMaterial' : (stage.name || 'Anonymous'),
          code
        })
      }
      for (const [code, stage] of programs.fragment.entries()) {
        const isOurShader = code === matFragmentShader
        result.fragment.push({
          name: isOurShader ? 'ShaderGraphMaterial' : (stage.name || 'Anonymous'),
          code
        })
      }
      for (const [code, stage] of programs.compute.entries()) {
        const isOurShader = code === simComputeShader
        result.compute.push({
          name: isOurShader ? 'ShaderGraphSimulation' : (stage.name || 'Anonymous'),
          code
        })
      }
    }

    return result
  }
}
