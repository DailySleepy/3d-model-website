<template>
  <div ref="container" class="w-full h-full model-viewer-container relative">

    <div v-if="isLoading" class="absolute inset-0 bg-[radial-gradient(circle,#303030,#121212)] flex flex-col justify-center items-center z-[999]">

      <div class="relative w-[120px] h-[120px] flex justify-center items-center">

        <svg class="-rotate-90" width="120" height="120">
          <circle class="stroke-white/10" stroke-width="8" fill="transparent" r="50" cx="60" cy="60"/>
          <circle class="stroke-cyan-400 transition-[stroke-dashoffset] duration-150 ease-out"
            stroke-width="8" fill="transparent" r="50" cx="60" cy="60"
            stroke-dasharray="314.16"
            :stroke-dashoffset="314.16 * (1 - loadingProgress / 100)"/>
        </svg>

        <span class="absolute text-xl font-semibold text-white">{{ loadingProgress }}%</span>
      </div>

      <div class="mt-4 text-sm text-zinc-400 uppercase tracking-widest">loading</div>
    </div>

  </div>
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

const isLoading = ref(true);
const loadingProgress = ref(0);

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
      isLoading.value = true
      loadingProgress.value = 0

      mixer = await loadModel(props.modelUrl, scene, camera, controls, (percent) => {
        loadingProgress.value = percent
      })
    } catch (error) {
      console.error("模型加载失败", error)
    } finally {
      isLoading.value = false
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
