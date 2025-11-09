<template>
  <div ref="container" class="model-viewer-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { initScene, loadModel } from '@/utils/threejs.js' // 从utils提取

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
    animate()
  })
})

watch(() => props.modelUrl, (newUrl) => {
  if (newUrl && scene) {
    loadModel(newUrl, scene, camera, controls)
  }
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

<style scoped>
.model-viewer-container {
  width: 100%;
  height: 100%;
}
</style>
