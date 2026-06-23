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
      :snapToGrid="snapToGrid"
      :snapGrid="[20, 20]"
      selection-mode="partial"
      @connect="onConnect"
      @edgesChange="onEdgeChange"
      @edgeDoubleClick="onEdgeDoubleClick"
      class="vue-flow-dark"
    >
      <Background patternColor="#2c2c2e" gap="20" />
      <Controls />
    </VueFlow>

    <NodeSearchMenu
      v-if="searchMenu.visible"
      :searchMenu="searchMenu"
      @spawnNode="spawnNode"
      @close="closeSearchMenu"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, markRaw, inject, provide, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry.js'
import { useGraphShortCuts } from '../composables/useGraphShortcuts.js'
import { useNodeSearch } from '../composables/useNodeSearch.js'
import { useShaderGraphStore } from '../stores/shaderGraph.js'

import UniversalNode from './UniversalNode.vue'
import NodeSearchMenu from './NodeSearchMenu.vue'

const store = useShaderGraphStore()

const { addEdges, removeEdges, getViewport, setViewport, fitView, getSelectedNodes } = useVueFlow()

defineExpose({
  fitCanvasView: async () => {
    await nextTick()
    fitView({ padding: 0.2 })
  },
  getSelectedSubgraph: () => {
    const selectedNodes = getSelectedNodes.value.filter(node => node.category !== 'OUTPUT')
    const selectedNodesIdsSet = new Set(selectedNodes.map(n => n.id))
    const innerEdges = store.currentEdges.filter(
      edge => selectedNodesIdsSet.has(edge.source) && selectedNodesIdsSet.has(edge.target)
    )
    return { nodes: selectedNodes, edges: innerEdges }
  }
})

const onEdgeChange = async (changes) => {
  const hadGraphChanged = changes.some(c => c.type === 'remove' || c.type === 'add')
  if (hadGraphChanged) {
    await nextTick()
    store.triggerCompile()
  }
}

const onConnect = (params) => {
  addEdges(params)
}

const onEdgeDoubleClick = ({ edge }) => {
  removeEdges(edge)
}

const isValidConnection = (connection) => {
  if (connection.source === connection.target) return false

  const sourceNode = store.currentNodes.find(n => n.id === connection.source)
  const targetNode = store.currentNodes.find(n => n.id === connection.target)
  if (!sourceNode || !targetNode) return false

  const sourceConfig = nodeRegistry[sourceNode.type]
  const targetConfig = nodeRegistry[targetNode.type]
  if (!sourceConfig || !targetConfig) return false

  // 判断插槽是输入还是输出
  const isSourceInput = sourceConfig.inputs?.some(i => i.id === connection.sourceHandle)
  const isSourceOutput = sourceConfig.outputs?.some(o => o.id === connection.sourceHandle)
  const isTargetInput = targetConfig.inputs?.some(i => i.id === connection.targetHandle)
  const isTargetOutput = targetConfig.outputs?.some(o => o.id === connection.targetHandle)

  // 必须一个是输出端口，一个是输入端口
  const isValidDirection = (isSourceOutput && isTargetInput) || (isSourceInput && isTargetOutput)
  if (!isValidDirection) return false

  // TODO: 判断连线 from 的类型是否能隐式转换为 to (vec -> float)
  return true
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
</style>
