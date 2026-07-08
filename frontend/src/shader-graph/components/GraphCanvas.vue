<template>
  <div class="w-full h-full relative overflow-visible">
    <VueFlow
      v-model:nodes="store.currentNodes"
      v-model:edges="store.currentEdges"
      :nodeTypes="nodeTypes"
      :isValidConnection="isValidConnection"
      :panOnDrag="[2]"
      :selectNodesOnDrag="true"
      :selectionKeyCode="true"
      :deselectOnDrag="false"
      :deleteKeyCode="null"
      :snapToGrid="snapToGrid"
      :snapGrid="[20, 20]"
      selection-mode="partial"
      @connect="onConnect"
      @edgesChange="onEdgeChange"
      @edgeDoubleClick="onEdgeDoubleClick"
      @nodeDragStart="onNodeDragStart"
      @nodeDrag="onNodeDrag"
      @nodeDragStop="onNodeDragStop"
      class="vue-flow-dark"
    >
      <Background patternColor="#2c2c2e" gap="20" />
      <Controls />
    </VueFlow>

    <Transition name="fade-scale">
      <NodeSearchMenu
        v-if="searchMenu.visible"
        :searchMenu="searchMenu"
        @spawnNode="spawnNode"
        @close="closeSearchMenu"
      />
    </Transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, markRaw, inject, provide, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { nodeRegistry } from '@/rendering/nodeRegistry.js'
import { useGraphShortCuts } from '../composables/useGraphShortcuts.js'
import { useNodeSearch } from '../composables/useNodeSearch.js'
import { useGraphConnectionUX } from '../composables/useGraphConnectionUX.js'
import { useShaderGraphStore } from '../stores/shaderGraph.js'

import UniversalNode from './UniversalNode.vue'
import NodeSearchMenu from './NodeSearchMenu.vue'

const store = useShaderGraphStore()

const { getViewport, setViewport, fitView, getSelectedNodes } = useVueFlow()

defineExpose({
  fitCanvasView: async () => {
    await nextTick()
    fitView({ padding: 0.2 })
  },
  getSelectedSubgraph: () => {
    const selectedNodes = getSelectedNodes.value.filter(node => node.data.category !== 'OUTPUT')
    if (selectedNodes.length === 0) return { nodes: [], edges: [] }
    const selectedNodesIdsSet = new Set(selectedNodes.map(n => n.id))
    const innerEdges = store.currentEdges.filter(
      edge => selectedNodesIdsSet.has(edge.source) && selectedNodesIdsSet.has(edge.target)
    )
    return { nodes: selectedNodes, edges: innerEdges }
  }
})

const {
  isValidConnection,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop
} = useGraphConnectionUX()

const onEdgeChange = async (changes) => {
  // 如果所有变化都是针对临时边的添加或移除，则不触发编译
  const isAllTempChange = changes.every(c => {
    if (c.type === 'remove') {
      const edge = store.currentEdges.find(e => e.id === c.id)
      return edge?.isTemp === true
    }
    if (c.type === 'add') {
      return c.item?.isTemp === true
    }
    return true
  })
  if (isAllTempChange) return

  const hadGraphChanged = changes.some(c => c.type === 'remove' || c.type === 'add')
  if (hadGraphChanged) {
    await nextTick()
    store.compileActiveTab()
  }
}

const onConnect = (params) => {
  store.addConnection(params)
}

const onEdgeDoubleClick = ({ edge }) => {
  store.removeEdge(edge.id)
}

const { searchMenu, openSearchMenu, closeSearchMenu, spawnNode } = useNodeSearch()

const { snapToGrid } = useGraphShortCuts({ openSearchMenu })

const nodeTypes = {}
Object.keys(nodeRegistry).forEach(key => {
  nodeTypes[key] = markRaw(UniversalNode)
})

const viewports = {
  material: { x: 0, y: 0, zoom: 1 },
  simulation: { x: 0, y: 0, zoom: 1 }
}

watch(() => store.activeTab, async (newTab, oldTab) => {
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
  touch-action: none;
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

/* 隐藏松开鼠标完成多选后的外层大蓝色遮罩框 */
.vue-flow__nodesselection {
  display: none !important;
}

/* 剪刀模式样式 */
.is-cutting, .is-cutting * {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' style='font-size:18px'><text y='18'>✂️</text></svg>") 4 14, crosshair !important;
}

/* 剪断连线用的 SVG 覆盖层和线条 */
.cutting-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
}
.cutting-line {
  fill: none;
  stroke: #ef4444;
  stroke-width: 3;
  stroke-dasharray: 6 4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.6));
}

/* 搜索菜单的渐变淡入缩放动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.12s ease-out;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
