<template>
  <div class="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
    <GraphHeader
      v-model:activeTab="activeTab"
      v-model:particleCount="particleCount"
      v-model:selectedGeometry="selectedGeometry"
      @onParticleCountChange="onParticleCountChange"
      @onGeometryChange="onGeometryChange"
      @onCustomModelUpload="onCustomModelUpload"
      @onParticleReset="onParticleReset"
      @onCameraReset="onCameraReset"
    />

    <!-- Workspace -->
    <div ref="workspaceRef" class="flex-1 flex overflow-hidden relative">

      <!-- Vue Flow 画布 -->
      <div class="h-full relative shrink-0" :style="{ width: graphWidth > 0 ? `${graphWidth}px` : '62%' }">
        <GraphCanvas
          v-model:nodes="currentNodes"
          v-model:edges="currentEdges"
          :activeTab="activeTab"
        />
      </div>

      <!-- 分界线 -->
      <div class="w-1.5 h-full bg-zinc-900 border-x border-zinc-800 hover:bg-indigo-500 hover:border-indigo-500 cursor-col-resize transition-all duration-150 z-10 select-none shrink-0"
        @mousedown="startResizing"
      ></div>

      <!-- Three.js 渲染 -->
      <div ref="canvasContainer" class="flex-1 h-full min-w-0"></div>
    </div>
  </div>
</template>

<script setup>
import { ShaderGraphEngine } from '@/rendering/shader-graph/engine'
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'

import GraphCanvas from './components/GraphCanvas.vue'
import GraphHeader from './components/GraphHeader.vue'

import { createNode } from './utils/nodeFactory.js'
import { useGraphResize } from './composables/useGraphResize.js'

const activeTab = ref('material')
const canvasContainer = ref(null)
const particleCount = ref(1)
const selectedGeometry = ref('sphere')
const customModelFile = ref(null)
const customModelUrl = ref(null)
const workspaceRef = ref(null)
const graphWidth = ref(0)

const isMat = computed(() => activeTab.value === 'material')

const matNodes = ref([createNode('mat-output', { x: 750, y: 300 })])
const matEdges = ref([])

const simNodes = ref([createNode('sim-output', { x: 750, y: 300 })])
const simEdges = ref([])

const currentNodes = computed({
  get: () => isMat.value ? matNodes.value : simNodes.value,
  set: (val) => {
    if (isMat.value) matNodes.value = val
    else simNodes.value = val
  }
})

const currentEdges = computed({
  get: () => isMat.value ? matEdges.value : simEdges.value,
  set: (val) => {
    if (isMat.value) matEdges.value = val
    else simEdges.value = val
  }
})

/** @type {ShaderGraphEngine} */
let engineInstance = null

const compileMaterial = () => {
  if (engineInstance) {
    engineInstance.compileMaterial(matNodes.value, matEdges.value)
  }
}

const compileSimulation = () => {
  if (engineInstance) {
    engineInstance.compileSimulation(simNodes.value, simEdges.value)
  }
}

let isUpdating = false

const onGeometryChange = async () => {
  if (!engineInstance || isUpdating) return
  if (selectedGeometry.value === 'custom' && customModelUrl.value === null) return

  try {
    isUpdating = true
    await engineInstance.updateGeometry(selectedGeometry.value, customModelUrl.value)
    compileMaterial()
  } finally {
    isUpdating = false
  }
}

const onCustomModelUpload = (file) => {
  customModelFile.value = file
  if (customModelUrl.value) URL.revokeObjectURL(customModelUrl.value)
  customModelUrl.value = URL.createObjectURL(file)
  onGeometryChange()
}

const onParticleCountChange = async () => {
  if (!engineInstance || isUpdating) return

  try {
    isUpdating = true
    await engineInstance.updateParticleCount(
      particleCount.value,
      simNodes.value,
      simEdges.value,
      matNodes.value,
      matEdges.value
    )
  } finally {
    isUpdating = false
  }
}

const onParticleReset = async () => {
  if (!engineInstance || isUpdating) return

  try {
    isUpdating = true
    await engineInstance.resetParticleBuffers(simNodes.value, simEdges.value)
  } finally {
    isUpdating = false
  }
}

const onCameraReset = () => {
  if (engineInstance) {
    engineInstance.resetCamera()
  }
}

const { startResizing } = useGraphResize(workspaceRef, graphWidth, () => {
  if (engineInstance) {
    engineInstance.resize()
  }
})

let compileTimeout = null

const triggerCompile = () => {
  if (compileTimeout) {
    clearTimeout(compileTimeout)
  }

  compileTimeout = setTimeout(() => {
    if (isMat.value) compileMaterial()
    else compileSimulation()
  }, 50)
}

provide('triggerCompile', triggerCompile)

onMounted(() => {
  if (canvasContainer.value) {
    engineInstance = new ShaderGraphEngine();
    engineInstance.init(canvasContainer.value, {
      particleCount: particleCount.value,
      selectedGeometry: selectedGeometry.value,
      customModelUrl: customModelUrl.value
    })

    compileMaterial()
    compileSimulation()
  }
})

onUnmounted(() => {
  if (engineInstance) engineInstance.destroy()
  if (customModelUrl.value) URL.revokeObjectURL(customModelUrl.value)
})

</script>
