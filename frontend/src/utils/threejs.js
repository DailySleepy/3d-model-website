import * as THREE from 'three'

// 场景
export const createScene = (backgroundColor = 0xdddddd) => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(backgroundColor)
  return scene
}

// 相机
export const createCamera = (container, fov = 75, near = 0.1, far = 1000) => {
  const camera = new THREE.PerspectiveCamera(
    fov,
    container.clientWidth / container.clientHeight,
    near,
    far
  )
  camera.position.z = 2
  return camera
}

// 渲染器
export const createRenderer = (container, antialias = true) => {
  const renderer = new THREE.WebGLRenderer({ antialias })
  renderer.setSize(container.clientWidth, container.clientHeight)
  return renderer
}

// 基础灯光
export const createBasicLights = () => {
  const lights = []

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  lights.push(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(5, 5, 5)
  lights.push(directionalLight)

  return lights
}

// 调整相机位置以适应模型
export const fitCameraToObject = (camera, object, controls, fitOffset = 1.5) => {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

  camera.position.z = cameraZ * fitOffset
  camera.position.y = size.y / 2

  if (controls) {
    controls.target.copy(center)
    controls.update()
  }
}
