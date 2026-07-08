import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref, nextTick } from 'vue';
import { ShaderGraphEngine } from "@/rendering/engine";
import { createNode } from '../utils/nodeFactory';
import { remapAndRepositionGraph, generateBaseExportData, getUsedTextures } from '../utils/graphIO';
import { loadThreeTexture } from '@/rendering/utils';
import { useLoadingProgress } from '@/composables/useLoadingProgress.js';
import { nodeRegistry } from '@/rendering/nodeRegistry';
import { getDefaultValueForType } from '@/rendering/registryUtils';

export const useShaderGraphStore = defineStore('shaderGraph', () => {
  // ----------------------------------------
  // State
  // ----------------------------------------
  const activeTab = ref('material')
  const enableSimulation = ref(false)
  const particleCount = ref(1)
  const selectedGeometry = ref('sphere')
  const customModelUrl = ref(null)
  const customModelFile = ref(null)
  const customTextures = ref([])
  const isDirty = ref(false)
  const hasTempEdge = ref(false)

  const availableAttributes = ref(['position', 'normal', 'uv'])

  const showUserGuide = ref(false)
  const showFPS = ref(false)
  const fps = ref(0)
  const frameMs = ref(0)

  const publishData = ref(null)
  const forkData = ref(null)
  const uploadPageState = ref(null)

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

  const {
    isLoading,
    loadingProgress,
    targetProgress,
    startProgressAnimation,
    stopProgressAnimation,
    waitProgressComplete
  } = useLoadingProgress()

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

  const edgesLUT = computed(() => {
    const iLut = new Map() // target 方向 (input): targetNodeId_targetHandleId -> Edge
    const oLut = new Map() // source 方向 (output): sourceNodeId_sourceHandleId -> Edge[]

    currentEdges.value.forEach(edge => {
      if (edge.isTemp) return

      // 输入是单一的，可以直接映射到具体 Edge
      iLut.set(`${edge.target}_${edge.targetHandle}`, edge)

      // 输出是分叉多出的，映射到 Edge 数组
      const outKey = `${edge.source}_${edge.sourceHandle}`
      if (!oLut.has(outKey)) oLut.set(outKey, [])
      oLut.get(outKey).push(edge)
    })
    return { iLut, oLut }
  })
  const inputEdgesLUT = computed(() => edgesLUT.value.iLut)
  const outputEdgesLUT = computed(() => edgesLUT.value.oLut)

  const nodesLUT = computed(() => {
    const map = new Map()
    currentNodes.value.forEach(node => {
      map.set(node.id, node)
    })
    return map
  })

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
    isDirty.value = true
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
    isDirty.value = true
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
    isDirty.value = true
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

    // 连接到输入插槽后断开这个输入插槽原来的连接 (先检查输入插槽原本是否存在连线)
    const existingEdge = inputEdgesLUT.value.get(`${connection.target}_${connection.targetHandle}`)
    if (existingEdge) {
      currentEdges.value = currentEdges.value.filter(e => e.id !== existingEdge.id)
    }

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

  const applyGraphData = async ({ targetTab, graph, mode, mousePos = null, shouldCompile = true }) => {
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
    }
    else { // append
      const { nodes: newNodes, edges: newEdges } = remapAndRepositionGraph(
        nodes, edges,
        targetTab === activeTab.value ? mousePos : null
      )

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
    }

    if (shouldCompile) {
      if (activeTab.value === 'material') {
        compileMaterial()
      } else if (activeTab.value === 'simulation') {
        compileSimulation()
      }
    }

    return true
  }

  let canTakeSnapshot = true
  let snapShotTimeout = null

  const updateNodeData = (nodeId, newData) => {
    const node = nodesLUT.value.get(nodeId)
    if (!node) return

    if (canTakeSnapshot) {
      takeSnapshot()
      canTakeSnapshot = false
    }

    if (newData.properties) {
      const nodeConfig = nodeRegistry[node.type]
      if (nodeConfig && nodeConfig.inputs) {
        const oldProps = { ...node.data.properties }
        const newProps = { ...node.data.properties, ...newData.properties }

        nodeConfig.inputs.forEach(input => {
          if (typeof input.defaultType === 'function') {
            const oldType = input.defaultType(oldProps)
            const newType = input.defaultType(newProps)

            // 如果动态计算出来的类型不同，重置或强转其在 inputs 里的缓存值
            if (oldType !== newType) {
              let defaultVal = typeof input.defaultValue === 'function'
                ? input.defaultValue(newProps)
                : input.defaultValue

              if (defaultVal === undefined) {
                defaultVal = getDefaultValueForType(newType)
              }

              if (node.data.inputs) {
                node.data.inputs[input.id] = defaultVal
              }
            }
          }
        })
      }
      Object.assign(node.data.properties, newData.properties)
    }
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

  const initEngineInstance = async () => {
    if (renderingContainer.value) {
      engineInstance = new ShaderGraphEngine();
      engineInstance.onAttributesSync = (attrs) => {
        setAvailableAttributes(attrs)
      }
      engineInstance.fpsCallback = ({ fps: calculatedFps, ms: averageMs }) => {
        fps.value = calculatedFps
        frameMs.value = averageMs
      }
      await engineInstance.init(renderingContainer.value, {
        particleCount: particleCount.value,
        selectedGeometry: selectedGeometry.value,
        customModelUrl: customModelUrl.value,
        mode: enableSimulation.value ? 'particle' : 'classic'
      })
      compileMaterial()
      if (enableSimulation.value) {
        compileSimulation()
      }
    }
  }

  const clearBlobResources = () => {
    if (customModelUrl.value && customModelUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(customModelUrl.value)
    }
    customTextures.value.forEach(tex => {
      if (tex.url && tex.url.startsWith('blob:')) {
        URL.revokeObjectURL(tex.url)
      }
    })
  }

  const destroyEngineInstance = () => {
    customTextures.value.forEach(tex => {
      if (tex.texture) {
        tex.texture.dispose()
      }
    })
    if (engineInstance) {
      engineInstance.destroy()
      engineInstance = null
    }
  }

  const getTexturesMap = () => {
    const texturesMap = {}
    customTextures.value.forEach(tex => {
      if (tex.texture) {
        texturesMap[tex.id] = tex.texture
      }
    })
    return texturesMap
  }

  const compileMaterial = () => {
    if (engineInstance) {
      const realEdges = hasTempEdge.value
        ? matEdges.value.filter(e => !e.isTemp)
        : matEdges.value
      engineInstance.compileMaterial(matNodes.value, realEdges, getTexturesMap())
    }
  }

  const compileSimulation = () => {
    if (engineInstance) {
      const realEdges = hasTempEdge.value
        ? simEdges.value.filter(e => !e.isTemp)
        : simEdges.value
      engineInstance.compileSimulation(simNodes.value, realEdges, getTexturesMap())
    }
  }

  const loadAndAddTexture = async ({ url, name, file = null, explicitId = null, shouldCompile = true, onError = null }) => {
    const id = explicitId || 'tex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    try {
      const texture = await loadThreeTexture(url)
      const newTex = { id, name, file, url, texture }
      customTextures.value.push(newTex)
      isDirty.value = true
      if (shouldCompile) {
        compileActiveTab()
      }
      return newTex
    } catch (err) {
      if (onError) onError(err)
      throw err
    }
  }

  const addCustomTextureFromFile = (file, explicitId = null, shouldCompile = true) => {
    const url = URL.createObjectURL(file)
    return loadAndAddTexture({
      url,
      name: file.name,
      file,
      explicitId,
      shouldCompile,
      onError: () => URL.revokeObjectURL(url)
    })
  }

  const addCustomTextureFromBlob = (blob, name, id, shouldCompile = true) => {
    const file = new File([blob], name, { type: blob.type })
    return addCustomTextureFromFile(file, id, shouldCompile)
  }

  const addCustomTextureFromUrl = (url, name, explicitId = null, shouldCompile = true) => {
    return loadAndAddTexture({ url, name, explicitId, shouldCompile })
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

  const insertNodeOnEdge = (nodeId, edgeId, inSlotId, outSlotId) => {
    const edge = currentEdges.value.find(e => e.id === edgeId)
    if (!edge) return

    takeSnapshot()

    const originalSource = edge.source
    const originalSourceHandle = edge.sourceHandle
    const originalTarget = edge.target
    const originalTargetHandle = edge.targetHandle

    // 1. 删除原有的 edge
    currentEdges.value = currentEdges.value.filter(e => e.id !== edgeId)

    // 2. 添加新边 1: originalSource -> nodeId(inSlotId)
    const newEdge1 = {
      id: `vueflow__edge-${originalSource}${originalSourceHandle || ''}-${nodeId}${inSlotId}`,
      source: originalSource,
      sourceHandle: originalSourceHandle,
      target: nodeId,
      targetHandle: inSlotId
    }

    // 3. 添加新边 2: nodeId(outSlotId) -> originalTarget
    const newEdge2 = {
      id: `vueflow__edge-${nodeId}${outSlotId}-${originalTarget}${originalTargetHandle || ''}`,
      source: nodeId,
      sourceHandle: outSlotId,
      target: originalTarget,
      targetHandle: originalTargetHandle
    }

    currentEdges.value = [...currentEdges.value, newEdge1, newEdge2]
    compileActiveTab()
  }

  const onGeometryChange = async (shouldCompile = true, onProgress = null) => {
    if (!engineInstance || isUpdating) return
    if (selectedGeometry.value === 'custom' && customModelUrl.value === null) return

    try {
      isUpdating = true
      await engineInstance.updateGeometry(selectedGeometry.value, customModelUrl.value, onProgress)
      if (shouldCompile) {
        compileMaterial()
        if (enableSimulation.value) {
          compileSimulation()
          // 理论上单纯改变模型无需重编译模拟图
          // 但是目前存在问题: 新模型无法利用已存在的缓冲区和着色器, 简单起见在这里重新编译触发缓冲区和着色器刷新
        }
      }
      isDirty.value = true
    } finally {
      isUpdating = false
    }
  }

  const onCustomModelUpload = async (file, shouldCompile = true) => {
    selectedGeometry.value = 'custom'
    customModelFile.value = file
    if (customModelUrl.value && customModelUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(customModelUrl.value)
    }
    customModelUrl.value = URL.createObjectURL(file)
    await onGeometryChange(shouldCompile)
  }

  const onParticleCountChange = async (shouldCompile = true, onProgress = null) => {
    if (!engineInstance || isUpdating) return

    try {
      isUpdating = true
      await engineInstance.updateParticleCount(
        particleCount.value,
        shouldCompile ? simNodes.value : null,
        shouldCompile ? simEdges.value : null,
        shouldCompile ? matNodes.value : null,
        shouldCompile ? matEdges.value : null,
        onProgress
      )
      isDirty.value = true
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

  const toggleSimulationMode = async (enabled, shouldCompile = true) => {
    enableSimulation.value = enabled
    isDirty.value = true
    if (!enabled && activeTab.value === 'simulation') {
      activeTab.value = 'material'
    }
    if (engineInstance) {
      engineInstance.mode = enabled ? 'particle' : 'classic'
      await onGeometryChange(shouldCompile)
    }
  }

  /**
   * @typedef {Object} ProjectSettings
   * @property {boolean} [enableSimulation] - 是否开启粒子模拟
   * @property {number} [particleCount] - 粒子实例化数量
   * @property {string} [selectedGeometry] - 3D 几何体形状 ('sphere'|'box'|'cylinder'|'torus'|'plane'|'custom')
   */
  /**
   * 更新全局项目设置并按需更新几何
   * @param {ProjectSettings} settings - 全局项目设置对象
   * @param {boolean} [shouldCompile=true] - 是否自动重新编译节点图
   */
  const updateProjectSettings = async (settings = {}, shouldCompile = true, onProgress = null) => {
    let modeChanged = false
    let geometryChanged = false
    let particleCountChanged = false

    const { enableSimulation: simEnabled, particleCount: pCount, selectedGeometry: geometry } = settings

    if (typeof simEnabled === 'boolean' && simEnabled !== enableSimulation.value) {
      enableSimulation.value = simEnabled
      if (!simEnabled && activeTab.value === 'simulation') {
        activeTab.value = 'material'
      }
      if (engineInstance) {
        engineInstance.mode = simEnabled ? 'particle' : 'classic'
      }
      modeChanged = true
    }

    if (pCount && pCount !== particleCount.value) {
      particleCount.value = pCount
      particleCountChanged = true
    }

    if (geometry && geometry !== selectedGeometry.value) {
      selectedGeometry.value = geometry
      geometryChanged = true
    }

    if (engineInstance) {
      if (particleCountChanged) {
        // onParticleCountChange 内部会自动执行 updateGeometry (onGeometryChange)
        await onParticleCountChange(shouldCompile, onProgress)
      } else if (modeChanged || geometryChanged) {
        await onGeometryChange(shouldCompile, onProgress)
      }
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

  let currentLoadId = 0

  const cancelLoading = () => {
    currentLoadId++
    stopProgressAnimation()
    isLoading.value = false
    clearGraphState()
  }


  const loadForkData = async () => {
    if (!forkData.value) return
    currentLoadId++
    const loadId = currentLoadId

    const currentForkData = forkData.value
    forkData.value = null
    const { shaderGraphJson, fileUrl } = currentForkData

    let parsedData = null
    if (shaderGraphJson) {
      try {
        parsedData = typeof shaderGraphJson === 'string' ? JSON.parse(shaderGraphJson) : shaderGraphJson
      } catch (e) {
        console.error("解析 shaderGraphJson 失败:", e)
        throw new Error("解析节点图 JSON 失败，数据已损坏")
      }
    }

    const handleModelProgress = (xhr) => {
      if (loadId !== currentLoadId) return
      if (xhr.total > 0) {
        targetProgress.value = Math.min(60, Math.floor((xhr.loaded / xhr.total) * 60))
      }
    }

    if (fileUrl) {
      customModelUrl.value = buildUrl(fileUrl)

      if (!parsedData) {
        selectedGeometry.value = 'custom'
        await onGeometryChange(false, handleModelProgress)
        if (loadId !== currentLoadId) return
      }
    }

    // 1. 加载全局配置
    if (parsedData) {
      const projectSettings = parsedData.projectSettings || {}
      await updateProjectSettings(projectSettings, false, handleModelProgress)
      if (loadId !== currentLoadId) return
    }
    targetProgress.value = 60

    // 2. 下载自定义贴图
    if (parsedData) {
      const assets = parsedData.assets || {}
      const texturesMeta = assets.customTextures
      if (texturesMeta && texturesMeta.length > 0) {
        let loaded = 0
        const total = texturesMeta.length
        const loadPromises = texturesMeta.map(async (texMeta) => {
          try {
            const exists = customTextures.value.some(t => t.id === texMeta.id)
            if (exists) return

            const texUrl = texMeta.path
            if (texUrl) {
              const resolvedUrl = buildUrl(texUrl)
              await addCustomTextureFromUrl(resolvedUrl, texMeta.name, texMeta.id, false)
            }
          } catch (err) {
            console.error("加载 fork 贴图失败:", texMeta, err)
          } finally {
            loaded++
            if (loadId === currentLoadId) {
              targetProgress.value = Math.min(90, Math.floor(60 + (loaded / total) * 30))
            }
          }
        })
        await Promise.all(loadPromises)
        if (loadId !== currentLoadId) return
      }
    }
    targetProgress.value = 90

    // 3. 载入节点与连线数据, 通过 nextTick 延迟载入连线 (此时 vue-flow 组件初次挂载)
    if (parsedData && parsedData.graphs) {
      const graphs = parsedData.graphs
      if (graphs.material) {
        matNodes.value = graphs.material.nodes || [createNode('mat-output', { x: 750, y: 300 })]
        matEdges.value = []
      }
      if (enableSimulation.value && graphs.simulation) {
        simNodes.value = graphs.simulation.nodes || [createNode('sim-output', { x: 750, y: 300 })]
        simEdges.value = []
      } else {
        simNodes.value = [createNode('sim-output', { x: 750, y: 300 })]
        simEdges.value = []
      }

      await nextTick()
      if (loadId !== currentLoadId) return

      if (graphs.material) {
        matEdges.value = graphs.material.edges || []
      }
      if (enableSimulation.value && graphs.simulation) {
        simEdges.value = graphs.simulation.edges || []
      }
    }

    compileMaterial()
    if (enableSimulation.value) {
      compileSimulation()
    }
    fitCanvasView()

    isDirty.value = false
  }

  const updatePublishData = () => {
    const graphsToExport = {
      material: {
        nodes: matNodes.value,
        edges: matEdges.value
      }
    }

    if (enableSimulation.value) {
      graphsToExport.simulation = {
        nodes: simNodes.value,
        edges: simEdges.value
      }
    }

    const projectSettings = {
      selectedGeometry: selectedGeometry.value,
      particleCount: particleCount.value,
      enableSimulation: enableSimulation.value
    }

    const exportData = generateBaseExportData({ graphs: graphsToExport, projectSettings })

    if (!exportData) {
      return false
    }

    const usedCustomTextures = getUsedTextures(exportData.graphs, customTextures.value)

    publishData.value = {
      shaderGraphJson: exportData,
      customModelFile: selectedGeometry.value === 'custom' ? customModelFile.value : null,
      customModelUrl: selectedGeometry.value === 'custom' ? customModelUrl.value : null,
      customTextures: usedCustomTextures
    }
    return true
  }

  const clearGraphState = () => {
    currentLoadId++
    isUpdating = false
    loadingProgress.value = 0
    stopProgressAnimation()
    clearBlobResources()

    customTextures.value.forEach(tex => {
      if (tex.texture) {
        tex.texture.dispose()
      }
    })

    customModelUrl.value = null
    customModelFile.value = null
    customTextures.value = []
    forkData.value = null
    selectedGeometry.value = 'sphere'
    enableSimulation.value = false
    showFPS.value = false
    fps.value = 0
    frameMs.value = 0

    matNodes.value = [createNode('mat-output', { x: 750, y: 300 })]
    matEdges.value = []
    simNodes.value = [createNode('sim-output', { x: 750, y: 300 })]
    simEdges.value = []

    historyState.value = {
      material: { past: [], future: [] },
      simulation: { past: [], future: [] }
    }
    availableAttributes.value = ['position', 'normal', 'uv']
    isDirty.value = false
  }

  const setAvailableAttributes = (attrs) => {
    if (Array.isArray(attrs) && attrs.length > 0) {
      availableAttributes.value = attrs
    } else {
      availableAttributes.value = ['position', 'normal', 'uv']
    }
  }

  return {
    activeTab, isMat, enableSimulation, particleCount, selectedGeometry, customModelUrl, customModelFile, customTextures,
    publishData, forkData, uploadPageState, isDirty, showFPS, showUserGuide, fps, frameMs, availableAttributes,
    graphCanvasRef, graphCanvasDOM, renderingContainer, toastRef,
    matNodes, matEdges, simNodes, simEdges, currentNodes, currentEdges,
    inputEdgesLUT, outputEdgesLUT, nodesLUT,
    historyState, takeSnapshot, undo, redo, addNode, removeElements, cloneSubgraph, addConnection, removeEdge, applyGraphData,
    updateNodeData, getSelectedSubgraph, fitCanvasView,
    initEngineInstance, destroyEngineInstance, compileActiveTab, compileMaterial, compileSimulation,
    hasTempEdge, insertNodeOnEdge,
    onGeometryChange, onCustomModelUpload, onParticleCountChange, onParticleReset, onCameraReset, toggleSimulationMode, updateProjectSettings, onGraphResize,
    addCustomTextureFromFile, addCustomTextureFromBlob, addCustomTextureFromUrl, loadForkData, clearGraphState, updatePublishData,
    isLoading, loadingProgress, targetProgress, startProgressAnimation, stopProgressAnimation, waitProgressComplete, cancelLoading,
    clearBlobResources, showToast, setAvailableAttributes
  }
})

const backendBase = import.meta.env.VITE_API_BASE_URL || ''
const buildUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useShaderGraphStore, import.meta.hot))
}
