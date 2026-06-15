import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createRadialGradientTexture } from './utils.js'

const WIDTH = 1200
const HEIGHT = 675

export function initScene(container) {
  const scene = new THREE.Scene()
  scene.background = createRadialGradientTexture(WIDTH, HEIGHT)

  const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 1000)
  camera.position.z = 2

  const renderer = new THREE.WebGPURenderer({ antialias: true })
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setSize(WIDTH, HEIGHT, false)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  container.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)
  scene.lightCount = 2;

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  return {scene, camera, renderer, controls}
}

export async function loadModel(modelPath, scene, camera, controls, onProgress) {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(modelPath, (xhr) => {
    if (xhr.total > 0) {
      onProgress(Math.round(xhr.loaded / xhr.total * 100))
    }
  })

  let lightCount = scene.lightCount || 2
  while (scene.children.length > lightCount) {
    const object = scene.children[lightCount]
    if (object.isMesh || object.isGroup) {
      scene.remove(object)
    }
  }
  scene.add(gltf.scene)

  // debugMaterial(gltf.scene)
  gltf.scene.traverse((child) => {
    if (child.isMesh && child.material.metalness == 1) {
      child.material.metalness = 0.7;
    }
  });

  let mixer = null
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(gltf.scene)
    const action = mixer.clipAction(gltf.animations[0])
    action.play()
  }

  const box = new THREE.Box3().setFromObject(gltf.scene)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

  camera.position.z = cameraZ * 1.8
  camera.position.y = size.y / 2
  controls.target.copy(center)
  controls.update()

  console.log('Model loaded:', gltf.scene)

  return mixer
}
