import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ShaderGraphEngine } from "@/rendering/shader-graph/engine";
import { createNode } from '../utils/nodeFactory';

export const useShaderGraphStore = defineStore('shaderGraph', () => {
  // ----------------------------------------
  // State
  // ----------------------------------------
  const activeTab = ref('material')
  const particleCount = ref(1)
  const selectedGeometry = ref('sphere')
  const customModelUrl = ref(null)
  const customModelFile = ref(null)

  const matNodes = ref([createNode('mat-output', { x: 750, y: 300 })])
  const matEdges = ref([])
  const simNodes = ref([createNode('sim-output', { x: 750, y: 300 })])
  const simEdges = ref([])

  const graphCanvasRef = ref(null)
  const renderingContainer = ref(null)

  // ----------------------------------------
  // Getters
  // ----------------------------------------
  const graphCanvasDOM = computed(() => {
    return graphCanvasRef.value?.$el || null
  })

  const isMat = computed(() => activeTab.value === 'material')

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

  const socketsAcitveMap = computed(() => {
    const iMap = new Map()
    const oMap = new Map()

    currentEdges.value.forEach(edge => {
      if (!iMap.get(edge.target)) iMap.set(edge.target, new Set())
      iMap.get(edge.target).add(edge.targetHandle)

      if (!oMap.get(edge.source)) oMap.set(edge.source, new Set())
      oMap.get(edge.source).add(edge.sourceHandle)
    })
    return { iMap, oMap }
  })
  const inputSocketsAcitveMap = computed(() => socketsAcitveMap.value.iMap)
  const outputSocketsAcitveMap = computed(() => socketsAcitveMap.value.oMap)

  // ----------------------------------------
  // Actions: Nodes
  // ----------------------------------------
  const updateNodeData = (nodeId, newData) => {
    const node = currentNodes.value.find((n) => n.id == nodeId)
    if (!node) return

    if (newData.properties) Object.assign(node.data.properties, newData.properties)
    if (newData.inputs) Object.assign(node.data.inputs, newData.inputs)

    triggerCompile() // TODO: 只修改值时不重编译, 而是设置 uniform
  }

  // ----------------------------------------
  // Actions: Engine
  // ----------------------------------------
  /** @type {ShaderGraphEngine} */
  let engineInstance = null
  let isUpdating = false
  let compileTimeout = null

  const initEngineInstance = () => {
    if (renderingContainer.value) {
      engineInstance = new ShaderGraphEngine();
      engineInstance.init(renderingContainer.value, {
        particleCount: particleCount.value,
        selectedGeometry: selectedGeometry.value,
        customModelUrl: customModelUrl.value
      })
      compileMaterial()
      compileSimulation()
    }
  }

  const destroyEngineInstance = () => {
    if (customModelUrl.value) URL.revokeObjectURL(customModelUrl.value)
    if (engineInstance) {
      engineInstance.destroy()
      engineInstance = null
    }
  }

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

  const triggerCompile = () => {
    if (compileTimeout) {
      clearTimeout(compileTimeout)
    }

    compileTimeout = setTimeout(() => {
      if (isMat.value) compileMaterial()
      else compileSimulation()
    }, 50)
  }

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

  const onGraphResize = () => {
    if (engineInstance) {
      engineInstance.resize()
    }
  }

  return {
    activeTab, particleCount, selectedGeometry, customModelUrl,
    graphCanvasRef, graphCanvasDOM, renderingContainer,
    matNodes, matEdges, simNodes, simEdges, currentNodes, currentEdges,
    inputSocketsAcitveMap, outputSocketsAcitveMap,
    updateNodeData,
    initEngineInstance, destroyEngineInstance, triggerCompile, compileMaterial, compileSimulation,
    onGeometryChange, onCustomModelUpload, onParticleCountChange, onParticleReset, onCameraReset, onGraphResize
  }
})
