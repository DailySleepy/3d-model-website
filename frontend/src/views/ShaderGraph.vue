<template>
  <div class="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none relative">
    <GraphHeader />

    <!-- Workspace -->
    <div ref="workspaceRef" class="flex-1 flex overflow-hidden relative">

      <!-- Vue Flow 画布 -->
      <div class="h-full relative shrink-0" :style="{ width: graphWidth > 0 ? `${graphWidth}px` : '62%' }">
        <GraphCanvas :ref="el => { store.graphCanvasRef = el }" />
      </div>

      <!-- 分界线 -->
      <div class="w-1.5 h-full bg-zinc-900 border-x border-zinc-800 hover:bg-indigo-500 hover:border-indigo-500 cursor-col-resize transition-all duration-150 z-10 select-none shrink-0"
        @mousedown="startResizing"
      ></div>

      <!-- Three.js 渲染 -->
      <div :ref="el => { store.renderingContainer = el }" class="flex-1 h-full min-w-0 relative">
        <div v-if="store.showFPS" class="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-mono text-emerald-400 flex items-center gap-1.5 z-10 pointer-events-none shadow-lg">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{{ store.fps }} FPS <span class="text-zinc-500 mx-0.5">·</span> {{ store.frameMs }} ms</span>
        </div>
      </div>
    </div>

    <ToastMessage :ref="el => { store.toastRef = el }" />

    <LoadingMask
      :visible="store.isLoading"
      :progress="store.loadingProgress"
      text="loading workspace"
      cancelable
      @cancel="handleCancelLoading"
    />

    <UserGuideModal
      v-if="store.showUserGuide"
      @close="store.showUserGuide = false"
    />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { confirmDialog } from '@/components/ConfirmDialog.vue'

import GraphCanvas from '@/shader-graph/components/GraphCanvas.vue'
import GraphHeader from '@/shader-graph/components/GraphHeader.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import LoadingMask from '@/components/LoadingMask.vue'
import UserGuideModal from '@/shader-graph/components/UserGuideModal.vue'

import { useGraphResize } from '@/shader-graph/composables/useGraphResize.js'
import { useShaderGraphStore } from '@/shader-graph/stores/shaderGraph.js'

const store = useShaderGraphStore()
const router = useRouter()

if (store.forkData) {
  store.isLoading = true
}

const handleCancelLoading = () => {
  store.cancelLoading()
  router.back()
}

const handleBeforeUnload = (e) => {
  if (store.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
}

const workspaceRef = ref(null)
const graphWidth = ref(0)

const { startResizing } = useGraphResize(workspaceRef, graphWidth, () => { store.onGraphResize() })

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.documentElement.classList.add('dark')

  if (store.forkData) {
    // 从模型详情页点击 Fork 跳转过来编辑，需要加载 forkData
    store.isLoading = true
    store.startProgressAnimation()

    await store.initEngineInstance()

    try {
      await store.loadForkData()
      store.showToast('原作资产载入成功', 'success')
    } catch (e) {
      console.error('载入原作资产失败:', e)
      store.showToast('载入原作资产失败', 'error')
    } finally {
      store.targetProgress = 100
      await store.waitProgressComplete(100)
    }
  } else if (store.uploadPageState) {
    // 从上传页跳转过来编辑，不需要重置画布数据，直接渲染当前模型
    await store.initEngineInstance()
  } else {
    // 全新进入，直接重置画布和模型状态
    store.clearGraphState()
    await store.initEngineInstance()
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  store.stopProgressAnimation()
  store.destroyEngineInstance()
  document.documentElement.classList.remove('dark')
})

onBeforeRouteLeave(async (to, from) => {
  if (to.path.startsWith('/upload')) {
    const success = store.updatePublishData()
    if (!success) {
      store.showToast('生成发布数据失败', 'error')
      return false
    }
  }
  else {
    if (store.isDirty) {
      const confirmed = await confirmDialog({
        title: '放弃未保存的修改？',
        message: '您有未保存的 ShaderGraph 画布修改，离开此页面将<span class="text-red-500 font-semibold" style="color: #ef4444;">丢失</span>这些修改。',
        confirmText: '确定离开',
        cancelText: '取消'
      })
      if (!confirmed) {
        return false
      }
    }
    store.uploadPageState = null
    store.publishData = null
    store.clearGraphState()
  }
})
</script>
