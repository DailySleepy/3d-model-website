<template>
  <div ref="container" class="w-full h-full model-viewer-container"></div>
</template>

<script setup>
import { initScene, loadModel } from '@/rendering/scene.js'
import { disposeScene } from '@/rendering/utils'
import * as THREE from 'three'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelUrl: {
    type: String,
    required: true
  },
  visible: {
    type: Boolean,
    default: true
  }
})

const container = ref(null)
/** @type {import('three').Scene} */
let scene = null
/** @type {import('three').PerspectiveCamera} */
let camera = null
/** @type {import('three').WebGLRenderer} */
let renderer = null
/** @type {import('three/examples/jsm/controls/OrbitControls').OrbitControls} */
let controls = null
/** @type {import('three').AnimationMixer} */
let mixer = null
let animationId = null
const clock = new THREE.Clock()

const animate = () => {
  if (!props.visible) return
  animationId = requestAnimationFrame(animate)
  const delta = clock.getDelta()
  if (mixer) {
    mixer.update(delta)
  }
  controls.update()
  renderer.render(scene, camera)
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (animationId) cancelAnimationFrame(animationId)
    clock.start()
    animate()
  }
  else {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    clock.stop()
  }
})

onMounted(async () => {
  const { scene: s, camera: c, renderer: r, controls: ctrl } = initScene(container.value)
  scene = s
  camera = c
  renderer = r
  controls = ctrl

  if (props.modelUrl) {
    try {
      mixer = await loadModel(props.modelUrl, scene, camera, controls)
    } catch (error) {
      console.error("模型加载失败", error)
    }
  }
  animate()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (mixer) {
    mixer.stopAllAction()
    mixer.uncacheRoot(mixer.getRoot())
    mixer = null
  }
  if (controls) {
    controls.dispose()
    controls = null
  }
  if (scene) {
    disposeScene(scene)
    scene = null
  }
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    let glCanvas = renderer.domElement
    if (glCanvas) {
      glCanvas.remove()
    }
    renderer = null
  }
  camera = null
})
</script>
