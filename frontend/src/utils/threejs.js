import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const RENDER_WIDTH = 1200
const RENDER_HEIGHT = 675

function createRadialGradientTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = RENDER_WIDTH
  canvas.height = RENDER_HEIGHT
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(
    RENDER_WIDTH / 2, RENDER_HEIGHT / 2, 0,
    RENDER_WIDTH / 2, RENDER_HEIGHT / 2, RENDER_WIDTH / 2
  )

  gradient.addColorStop(0, '#303030')
  gradient.addColorStop(1, '#121212')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, RENDER_WIDTH, RENDER_HEIGHT)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function initScene(container, callback) {
  const scene = new THREE.Scene()
  scene.background = createRadialGradientTexture()

  const camera = new THREE.PerspectiveCamera(45, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000)
  camera.position.z = 2

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  callback(scene, camera, renderer, controls)
}

export function loadModel(modelPath, scene, camera, controls) {
  const loader = new GLTFLoader()
  loader.load(
    modelPath,
    (gltf) => {
      while (scene.children.length > 2) {
        const object = scene.children[2]
        if (object.isMesh || object.isGroup) {
          scene.remove(object)
        }
      }
      scene.add(gltf.scene)

      const box = new THREE.Box3().setFromObject(gltf.scene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = camera.fov * (Math.PI / 180)
      const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

      camera.position.z = cameraZ * 1.5
      camera.position.y = size.y / 2
      controls.target.copy(center)
      controls.update()

      console.log('Model loaded:', gltf.scene)
    },
    (xhr) => {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    (error) => {
      console.error('An error happened', error)
    }
  )
}
