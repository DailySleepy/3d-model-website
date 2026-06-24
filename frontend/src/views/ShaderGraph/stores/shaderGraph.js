import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref, nextTick } from 'vue';
import { ShaderGraphEngine } from "@/rendering/shader-graph/engine";
import { createNode } from '../utils/nodeFactory';
import { remapAndRepositionGraph } from '../utils/graphIO';

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
  const toastRef = ref(null)

  const historyState = ref({
    material: { past: [], future: [] },
    simulation: { past: [], future: [] }
  })
  const maxHistoryDepth = 50

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
  // Actions: Nodes And Graph / Undo-Redo
  // ----------------------------------------
  const cloneGraphState = (nodes, edges) => {
    return {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    }
  }

  const takeSnapshot = (tab = activeTab.value) => {
    const hist = historyState.value[tab]
    const nodes = tab === 'material' ? matNodes.value : simNodes.value
    const edges = tab === 'material' ? matEdges.value : simEdges.value
    hist.past.push(cloneGraphState(nodes, edges))
    if (hist.past.length > maxHistoryDepth) {
      hist.past.shift()
    }
    hist.future = []
  }

  const undo = () => {
    const hist = historyState.value[activeTab.value]
    if (hist.past.length === 0) {
      showToast('无法撤销（已是最初状态）', 'info', 1000)
      return
    }

    hist.future.push(cloneGraphState(currentNodes.value, currentEdges.value))
    const prev = hist.past.pop()
    currentNodes.value = prev.nodes
    currentEdges.value = prev.edges

    compileActiveTab()
    showToast('已撤销', 'info', 1000)
  }

  const redo = () => {
    const hist = historyState.value[activeTab.value]
    if (hist.future.length === 0) {
      showToast('无法重做（已是最新状态）', 'info', 1000)
      return
    }

    hist.past.push(cloneGraphState(currentNodes.value, currentEdges.value))
    const next = hist.future.pop()
    currentNodes.value = next.nodes
    currentEdges.value = next.edges

    compileActiveTab()
    showToast('已重做', 'info', 1000)
  }

  const addNode = (node) => {
    if (!node) return
    takeSnapshot()
    currentNodes.value = [...currentNodes.value, node]
  }

  const removeElements = (nodesToRemove = [], edgesToRemove = []) => {
    if (nodesToRemove.length === 0 && edgesToRemove.length === 0) return
    takeSnapshot()

    const nodesIdsToRemove = new Set(nodesToRemove.map(n => n.id))
    const edgesIdsToRemove = new Set(edgesToRemove.map(e => e.id))

    const prevEdgesLength = currentEdges.value.length

    currentNodes.value = currentNodes.value.filter(n => !nodesIdsToRemove.has(n.id))
    currentEdges.value = currentEdges.value.filter(e => !edgesIdsToRemove.has(e.id) && !nodesIdsToRemove.has(e.source) && !nodesIdsToRemove.has(e.target))

    if (edgesToRemove.length !== 0 || prevEdgesLength !== currentEdges.value.length) {
      compileActiveTab()
    }
  }

  const cloneSubgraph = (subgraph, mousePos) => {
    if (!subgraph?.nodes?.length) return

    takeSnapshot()

    const { nodes: newNodes, edges: newEdges } = remapAndRepositionGraph(
      subgraph.nodes, subgraph.edges,
      mousePos
    )

    currentNodes.value.forEach(n => { n.selected = false })
    currentEdges.value.forEach(e => { e.selected = false })

    currentNodes.value = [...currentNodes.value, ...newNodes]
    currentEdges.value = [...currentEdges.value, ...newEdges]

    if (newEdges.length !== 0) {
      compileActiveTab()
    }
  }

  const addConnection = (connection) => {
    if (!connection) return
    takeSnapshot()

    const newEdge = {
      id: `vueflow__edge-${connection.source}${connection.sourceHandle || ''}-${connection.target}${connection.targetHandle || ''}`,
      source: connection.source,
      sourceHandle: connection.sourceHandle,
      target: connection.target,
      targetHandle: connection.targetHandle,
    }

    currentEdges.value = [...currentEdges.value, newEdge]
    compileActiveTab()
  }

  const removeEdge = (edgeId) => {
    if (!edgeId) return
    takeSnapshot()
    currentEdges.value = currentEdges.value.filter(e => e.id !== edgeId)
    compileActiveTab()
  }

  const applyGraphData = async (targetTab, graph, mode, mousePos = null) => {
    const { nodes = [], edges = [] } = graph
    if (nodes.length === 0) return false

    takeSnapshot(targetTab)

    if (mode === 'override') {
      if (targetTab === 'material') {
        matNodes.value = nodes
        matEdges.value = edges
      } else if (targetTab === 'simulation') {
        simNodes.value = nodes
        simEdges.value = edges
      }
      return true
    }
    else if (mode === 'append') {
      const { nodes: newNodes, edges: newEdges } = remapAndRepositionGraph(
        nodes, edges,
        targetTab === activeTab.value ? mousePos : null
      )

      if (newNodes.length > 0) {
        if (targetTab === 'material') {
          matNodes.value = [...matNodes.value, ...newNodes]
          matEdges.value = [...matEdges.value, ...newEdges]
        } else if (targetTab === 'simulation') {
          simNodes.value = [...simNodes.value, ...newNodes]
          simEdges.value = [...simEdges.value, ...newEdges]
        }

        if (targetTab === activeTab.value) {
          await nextTick()
          currentNodes.value.forEach(node => {
            node.selected = newNodes.some(n => n.id === node.id)
          })
          currentEdges.value.forEach(edge => {
            edge.selected = newEdges.some(e => e.id === edge.id)
          })
        }
        return true
      }
    }
    return false
  }

  let canTakeSnapshot = true
  let snapShotTimeout = null

  const updateNodeData = (nodeId, newData) => {
    const node = currentNodes.value.find((n) => n.id == nodeId)
    if (!node) return

    if (canTakeSnapshot) {
      takeSnapshot()
      canTakeSnapshot = false
    }

    if (newData.properties) Object.assign(node.data.properties, newData.properties)
    if (newData.inputs) Object.assign(node.data.inputs, newData.inputs)

    compileActiveTab() // TODO: 只修改值时不重编译, 而是设置 uniform

    if (snapShotTimeout) {
      clearTimeout(snapShotTimeout)
    }
    snapShotTimeout = setTimeout(() => {
      canTakeSnapshot = true
    }, 800)
  }

  const getSelectedSubgraph = () => {
    return graphCanvasRef.value?.getSelectedSubgraph() || { nodes: [], edges: [] }
  }

  const fitCanvasView = () => {
    graphCanvasRef.value?.fitCanvasView()
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

  const compileActiveTab = () => {
    if (compileTimeout) {
      clearTimeout(compileTimeout)
    }

    compileTimeout = setTimeout(() => {
      if (isMat.value) compileMaterial()
      else compileSimulation()
    }, 50)
  }

  const onGeometryChange = async (shouldCompile = true) => {
    if (!engineInstance || isUpdating) return
    if (selectedGeometry.value === 'custom' && customModelUrl.value === null) return

    try {
      isUpdating = true
      await engineInstance.updateGeometry(selectedGeometry.value, customModelUrl.value)
      if (shouldCompile) {
        compileMaterial()
      }
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

  const onParticleCountChange = async (shouldCompile = true) => {
    if (!engineInstance || isUpdating) return

    try {
      isUpdating = true
      await engineInstance.updateParticleCount(
        particleCount.value,
        shouldCompile ? simNodes.value : null,
        shouldCompile ? simEdges.value : null,
        shouldCompile ? matNodes.value : null,
        shouldCompile ? matEdges.value : null
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

  const showToast = (msg, msgType = 'info', duration = null, error = null) => {
    if (toastRef.value) {
      toastRef.value.show(msg, msgType, duration, error)
    }
  }

  return {
    activeTab, isMat, particleCount, selectedGeometry, customModelUrl,
    graphCanvasRef, graphCanvasDOM, renderingContainer, toastRef,
    matNodes, matEdges, simNodes, simEdges, currentNodes, currentEdges,
    inputSocketsAcitveMap, outputSocketsAcitveMap,
    historyState, takeSnapshot, undo, redo, addNode, removeElements, cloneSubgraph, addConnection, removeEdge, applyGraphData,
    updateNodeData, getSelectedSubgraph, fitCanvasView,
    initEngineInstance, destroyEngineInstance, compileActiveTab, compileMaterial, compileSimulation,
    onGeometryChange, onCustomModelUpload, onParticleCountChange, onParticleReset, onCameraReset, onGraphResize,
    showToast
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShaderGraphStore, import.meta.hot))
}
