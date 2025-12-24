<template>
  <div ref="container" class="w-full h-full model-viewer-container"></div>
</template>

<script setup>
import * as THREE from 'three'
import { ref, onMounted, onUnmounted } from 'vue'
import { initScene, loadModel } from '@/rendering/scene.js'

const props = defineProps({
  modelUrl: {
    type: String,
    required: true
  }
})

const container = ref(null)
let scene, camera, renderer, controls
let mixer = null
let animationId
const clock = new THREE.Clock()

onMounted(() => {
  initScene(container.value, (s, c, r, ctrl) => {
    scene = s
    camera = c
    renderer = r
    controls = ctrl
    if (props.modelUrl) loadModel(props.modelUrl, scene, camera, controls, (loadedMixer) => {
        mixer = loadedMixer
      })
    animate()
  })
})

const animate = () => {
  animationId = requestAnimationFrame(animate)
  const delta = clock.getDelta()
  if (mixer) {
    mixer.update(delta)
  }
  controls.update()
  renderer.render(scene, camera)
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})
</script>
