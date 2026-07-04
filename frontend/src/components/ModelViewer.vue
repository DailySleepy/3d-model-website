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
import { ShaderGraphEngine } from '@/rendering/engine.js'
import { useShaderGraphStore } from '@/shader-graph/stores/shaderGraph.js'
import { loadThreeTexture } from '@/rendering/utils.js'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelUrl: {
    type: String,
    required: false,
    default: ''
  },
  shaderGraphJson: {
    type: String,
    required: false,
    default: ''
  },
  visible: {
    type: Boolean,
    default: true
  }
})

const container = ref(null)
const shaderGraphStore = useShaderGraphStore()

/** @type {ShaderGraphEngine} */
let shaderGraphEngine = null

const isLoading = ref(false)
const loadingProgress = ref(0)
const isFullscreen = ref(false)
let resizeObserver = null

const backendBase = import.meta.env.VITE_API_BASE_URL || ''
const buildUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:')) return url
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

const startRenderEngine = async () => {
  isLoading.value = true
  loadingProgress.value = 0
  let parsedData = null

  // 锁定当前初始化的引擎实例并改写全局共享指针
  // 在之后每一次异步操作（await）返回后，将通过比对二者来拦截已被废弃的旧渲染任务流
  // 以防防范快速连续切换导致的渲染冲突或已销毁实例下的 null 指针报错
  const engine = new ShaderGraphEngine()
  shaderGraphEngine = engine

  try {
    if (props.shaderGraphJson) {
      parsedData = typeof props.shaderGraphJson === 'string'
        ? JSON.parse(props.shaderGraphJson)
        : props.shaderGraphJson
    }

    const projectSettings = parsedData?.projectSettings || {}
    const assets = parsedData?.assets || {}
    const particleCount = projectSettings.particleCount || 1
    let selectedGeometry = projectSettings.selectedGeometry || 'sphere'

    if (props.modelUrl) {
      selectedGeometry = 'custom'
    }

    let customModelUrl = null
    if (selectedGeometry === 'custom') {
      customModelUrl = props.modelUrl ? buildUrl(props.modelUrl) : (assets.customModel?.path ? buildUrl(assets.customModel.path) : null)
    }

    const enableSim = projectSettings.enableSimulation
    const mode = enableSim ? 'particle' : 'classic'

    await engine.init(container.value, {
      particleCount,
      selectedGeometry,
      customModelUrl,
      mode
    })
    if (shaderGraphEngine !== engine) return

    loadingProgress.value = 50

    const texturesMap = await loadTexturesMap(assets.customTextures)
    if (shaderGraphEngine !== engine) return

    loadingProgress.value = 80

    const graphs = parsedData?.graphs
    if (graphs) {
      if (graphs.material) {
        engine.compileMaterial(graphs.material.nodes, graphs.material.edges, texturesMap)
      }
      if (enableSim && graphs.simulation) {
        engine.compileSimulation(graphs.simulation.nodes, graphs.simulation.edges, texturesMap)
      }
    }
    loadingProgress.value = 100
    if (shaderGraphEngine === engine && !props.visible) {
      engine.stopLoop()
    }
  } catch (err) {
    if (shaderGraphEngine === engine) {
      console.error("ShaderGraphEngine 运行错误:", err)
    }
  } finally {
    if (shaderGraphEngine === engine) {
      isLoading.value = false
    }
  }
}

const loadTexturesMap = async (texturesMeta) => {
  const texturesMap = {}

  // 先尝试获取 store 中已有的纹理（上传页面）
  if (shaderGraphStore.customTextures && shaderGraphStore.customTextures.length > 0) {
    shaderGraphStore.customTextures.forEach(tex => {
      if (tex.texture) {
        texturesMap[tex.id] = tex.texture
      }
    })
  }

  // 再尝试用 shaderGraphJson.assets.customTextures 中的纹理 url 进行网络加载（模型详情页面）
  if (texturesMeta && texturesMeta.length > 0) {
    const promises = texturesMeta.map(async (texMeta) => {
      if (texturesMap[texMeta.id]) return

      const texUrl = texMeta.path
      if (!texUrl) return

      const resolvedUrl = buildUrl(texUrl)
      try {
        const texture = await loadThreeTexture(resolvedUrl)
        texturesMap[texMeta.id] = texture
      } catch (err) {
        console.error("加载自定义纹理失败:", resolvedUrl, err)
      }
    })
    await Promise.all(promises)
  }

  return texturesMap
}

const cleanResources = () => {
  if (shaderGraphEngine) {
    shaderGraphEngine.destroy()
    shaderGraphEngine = null
  }
}

watch(() => props.visible, (newVal) => {
  if (shaderGraphEngine) {
    if (newVal) {
      shaderGraphEngine.startLoop()
    } else {
      shaderGraphEngine.stopLoop()
    }
  }
})

watch(() => [props.modelUrl, props.shaderGraphJson], async () => {
  cleanResources()
  if (props.shaderGraphJson || props.modelUrl) {
    await startRenderEngine()
  }
})

const toggleFullscreen = () => {
  if (!container.value) return
  if (!document.fullscreenElement) {
    container.value.requestFullscreen()
      .then(() => {
        isFullscreen.value = true
      })
      .catch((err) => {
        console.error(`请求全屏失败: ${err.message}`)
      })
  } else {
    document.exitFullscreen()
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement === container.value
}

const handleKeyDown = (e) => {
  const activeEl = document.activeElement
  if (
    activeEl && 
    (activeEl.tagName === 'INPUT' || 
     activeEl.tagName === 'TEXTAREA' || 
     activeEl.isContentEditable)
  ) {
    return
  }

  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault()
    toggleFullscreen()
  }
}

const handleDblClick = () => {
  toggleFullscreen()
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleKeyDown)

  if (container.value) {
    container.value.addEventListener('dblclick', handleDblClick)

    resizeObserver = new ResizeObserver(() => {
      if (shaderGraphEngine) {
        shaderGraphEngine.resize()
      }
    })
    resizeObserver.observe(container.value)
  }

  if (props.shaderGraphJson || props.modelUrl) {
    await startRenderEngine()
  }
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleKeyDown)

  if (container.value) {
    container.value.removeEventListener('dblclick', handleDblClick)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  cleanResources()
})

const captureScreenshot = () => {
  if (!container.value) return null
  const canvas = container.value.querySelector('canvas')
  if (!canvas) return null
  try {
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('截图失败:', err)
    return null
  }
}

defineExpose({ captureScreenshot })
</script>
