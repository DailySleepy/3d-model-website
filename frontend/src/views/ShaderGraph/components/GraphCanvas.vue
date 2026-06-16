<template>
  <div class="w-full h-full relative overflow-visible" ref="canvasRef">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
    >
      <Background pattern-color="#2c2c2e" gap="20" />
      <Controls />
    </VueFlow>

    <NodeSearchMenu
      v-if="searchMenu.visible"
      :search-menu="searchMenu"
      @spawn-node="spawnNode"
      @close="closeSearchMenu"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, markRaw, inject } from 'vue'
import { VueFlow, addEdge, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry.js'
import { useGraphShortCuts } from '../composables/useGraphShortcuts.js'
import { useNodeSearch } from '../composables/useNodeSearch.js'
import UniversalNode from './UniversalNode.vue'
import NodeSearchMenu from './NodeSearchMenu.vue'

const nodes = defineModel('nodes', { type: Array, required: true })
const edges = defineModel('edges', { type: Array, required: true })
const props = defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

const triggerCompile = inject('triggerCompile')

const onConnect = () => {

}

const onEdgeChange = () => {

}

const onEdgeDoubleClick = () => {

}

const isValidConnection = () => {
  // TODO
}

const canvasRef = ref(null)

const { searchMenu, openSearchMenu, closeSearchMenu, spawnNode } = useNodeSearch({
  canvasRef, nodes
})

useGraphShortCuts({
  canvasRef, nodes, openSearchMenu
})

const nodeTypes = {}
Object.keys(nodeRegistry).forEach(key => {
  nodeTypes[key] = markRaw(UniversalNode)
})

const viewports = {
  material: { x: 0, y: 0, zoom: 1 },
  simulation: { x: 0, y: 0, zoom: 1 }
}

const { getViewport, setViewport } = useVueFlow()

watch(() => props.activeTab, async (newTab, oldTab) => {
  viewports[oldTab] = getViewport()
  await nextTick()
  setViewport(viewports[newTab])
})

</script>

<style>
/* 暗色调 Vue Flow 自定义主题变量覆盖 */
.vue-flow-dark {
  --vf-background-color: #121214;
  --vf-handle-hover-color: #6366f1;
  --vf-node-bg: transparent;
  --vf-node-border: transparent;
  --vf-edge-color: #3f3f46;
  --vf-edge-active-color: #6366f1;
  width: 100%;
  height: 100%;
}

/* 激活选中的连线路径 */
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #818cf8;
  stroke-width: 2.5;
}

/* 连线路径过渡平滑度优化 */
.vue-flow__edge-path {
  stroke-width: 2;
  transition: stroke 0.15s, stroke-width 0.15s;
}

/* 悬浮连线高亮 */
.vue-flow__edge:hover .vue-flow__edge-path {
  stroke: #6366f1;
  stroke-width: 2.5;
}

/* 框选多选框 */
.vue-flow__selection {
  background: rgba(99, 102, 241, 0.08) !important;
  border: 1px solid rgba(99, 102, 241, 0.5) !important;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
}
</style>
