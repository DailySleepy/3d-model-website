<template>
  <div class="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
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
      <div :ref="el => { store.renderingContainer = el }" class="flex-1 h-full min-w-0"></div>
    </div>

    <ToastMessage :ref="el => { store.toastRef = el }" />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

import GraphCanvas from './components/GraphCanvas.vue'
import GraphHeader from './components/GraphHeader.vue'
import ToastMessage from '@/components/ToastMessage.vue'

import { useGraphResize } from './composables/useGraphResize.js'
import { useShaderGraphStore } from './stores/shaderGraph.js'

const store = useShaderGraphStore()

const workspaceRef = ref(null)
const graphWidth = ref(0)

const { startResizing } = useGraphResize(workspaceRef, graphWidth, () => { store.onGraphResize() })

onMounted(() => {
  store.initEngineInstance()
  document.documentElement.classList.add('dark')
})

onUnmounted(() => {
  store.destroyEngineInstance()
  document.documentElement.classList.remove('dark')
})

</script>
