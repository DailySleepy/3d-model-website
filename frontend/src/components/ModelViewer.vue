<template>
  <div ref="container" class="w-full h-full model-viewer-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { initScene, loadModel } from '@/utils/threejs.js'

const props = defineProps({
  modelUrl: {
    type: String,
    required: true
  }
})

const container = ref(null)
let scene, camera, renderer, controls
let animationId

onMounted(() => {
  initScene(container.value, (s, c, r, ctrl) => {
    scene = s
    camera = c
    renderer = r
    controls = ctrl
    if (props.modelUrl) loadModel(props.modelUrl, scene, camera, controls)
    animate()
  })
})

const animate = () => {
  animationId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
})
</script>
