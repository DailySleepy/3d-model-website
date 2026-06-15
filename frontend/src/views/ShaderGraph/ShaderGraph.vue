<template>
  <div class="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
    <GraphHeader
      v-model:active-tab="activeTab"
      v-model:particle-count="particleCount"
      @on-particle-count-change="onParticleCountChange"
      @on-geometry-change="onGeometryChange"
      @on-custom-model-upload="onCustomModelUpload"
      @on-particle-reset="onParticleReset"
    />

    <!-- Workspace -->
    <div>
      <!-- Vue Flow 画布 -->
      <div></div>
      <!-- 分界线 -->
      <div></div>
      <!-- Three.js 渲染 -->
      <div></div>
    </div>
  </div>
</template>

<script setup>
import { ShaderGraphEngine } from '@/rendering/shader-graph/engine'
import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GraphHeader from './components/GraphHeader.vue'

const activeTab = ref('material')
const canvasContainer = ref(null)
const particleCount = ref(1)
const selectedGeometry = ref('sphere')
const customModelFile = ref(null)
const customModelUrl = ref(null)

const isMat = computed(() => activeTab.value === 'material')

const createNode = (type, position) => {
  const config = nodeRegistry[type]
  if (!config) return

  return {
    id: `node-${type}-${Date.now()}`,
    type: type,
    position: position,
    data: {
      label: config.label,
      category: config.category,
      properties: config.defaultProperties ? structuredClone(config.defaultProperties) : {},
      inputs: config.inputs ? structuredClone(config.inputs) : [],
      outputs: config.outputs ? structuredClone(config.outputs) : [],
    }
  }
}

const spawnNode = (type, position) => {
  const newNode = createNode(type, position)
  const nodeList = isMat.value ? matNodes.value : simNodes.value
  nodeList.push(newNode)
}

const matNodes = ref([createNode('mat-output', { x: 750, y: 300 })])
const matEdges = ref([])

const simNodes = ref([createNode('sim-output', { x: 750, y: 300 })])
const simEdges = ref([])

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


