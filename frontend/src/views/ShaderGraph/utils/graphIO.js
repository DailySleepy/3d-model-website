import JSZip from 'jszip'

/**
 * 验证并解析导入或粘贴的节点图 JSON 文本
 * @param {string} jsonText JSON 文本内容
 * @param {string} importMode 导入模式 ('all' | 'current' | 'selection')
 * @param {string} activeTab 当前画布激活的 Tab ('material' | 'simulation')
 * @returns {{isValid: boolean, hasFullGraph: boolean, graphs: Array, projectSettings: object, error: string}}
 * 验证结果对象，包含以下属性：
 * - `isValid`: 是否验证通过
 * - `hasFullGraph`: 是否包含任意一个输出节点的完整图
 * - `graphs`: 提取并标准化过滤后的图数据包数组
 * - `projectSettings`: 全局项目参数设置
 * - `error`: 错误信息描述
 */
export function parseGraphJSON(jsonText, importMode, activeTab) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch (e) {
    return { isValid: false, error: '<b>JSON 文件格式解析失败</b>，请检查是否为有效的 JSON 格式' }
  }

  if (typeof data !== 'object' || data === null) {
    return { isValid: false, error: '无效的数据格式，必须是一个 <b>JSON 对象</b>' }
  }

  if (!data.version || !data.graphs) {
    return { isValid: false, error: '未能识别的节点图数据结构，数据格式不合法' }
  }

  // 隐式将 selection 画布数据映射到当前激活的 activeTab 画布上
  if (importMode === 'current' && data.graphs.selection && !data.graphs[activeTab]) {
    data.graphs[activeTab] = data.graphs.selection
  }

  // 校验导入数据包中是否包含我们需要的最起码的画布数据
  if (importMode === 'all') {
    if (!data.graphs.material && !data.graphs.simulation) {
      return { isValid: false, error: '数据包内未包含任何 <b>材质</b> 或 <b>模拟</b> 画布节点数据' }
    }
  } else {
    if (!data.graphs[activeTab]) {
      const tabName = activeTab === 'material' ? '材质' : '模拟'
      return { isValid: false, error: `数据包内未包含当前激活的 <b>${tabName}</b> 画布数据` }
    }
  }

  let hasFullGraph = false
  const parsedGraphs = []

  let keysToCheck = importMode === 'all'
    ? ['material', 'simulation']
    : [activeTab]

  if (importMode === 'all' && data.projectSettings?.enableSimulation !== true) {
    keysToCheck = keysToCheck.filter(key => key !== 'simulation')
  }

  for (const key of keysToCheck) {
    const graphData = data.graphs[key]
    // all 模式下允许缺失单侧画布配置，静默跳过由业务层警告
    if (importMode === 'all' && !graphData) {
      continue
    }

    const result = checkGraph(graphData, key)
    if (!result.isValid) return result

    parsedGraphs.push({
      key,
      nodes: graphData.nodes || [],
      edges: graphData.edges || [],
      isFullGraph: result.isFullGraph
    })
    hasFullGraph ||= result.isFullGraph
  }

  return {
    isValid: true,
    hasFullGraph,
    graphs: parsedGraphs,
    projectSettings: data.projectSettings || null,
    assets: data.assets || null
  }
}

/**
 * 校验节点与连线合法性, 并判断是否是完整图
 */
function checkGraph(graph, targetTab) {
  if (!graph) {
    return { isValid: false, error: `未能识别到 ${targetTab} 部分数据` }
  }

  const { nodes = [], edges = [] } = graph
  let isFullGraph = false

  for (const node of nodes) {
    if (!node || typeof node.type !== 'string') {
      return { isValid: false, error: '存在不合法的节点数据，缺失节点类型' }
    }

    if (targetTab === 'material' && node.type === 'sim-output') {
      return { isValid: false, error: '无法在材质画布中导入模拟输出 (<b>sim-output</b>) 节点' }
    }
    if (targetTab === 'simulation' && node.type === 'mat-output') {
      return { isValid: false, error: '无法在模拟画布中导入材质输出 (<b>mat-output</b>) 节点' }
    }

    if (node.type === 'mat-output' || node.type === 'sim-output') {
      isFullGraph = true
    }
  }

  const nodeIds = new Set(nodes.map(n => n.id))

  for (const edge of edges) {
    if (!edge || !edge.source || !edge.target) {
      return { isValid: false, error: '存在不合法的连线数据，连线必须包含起点(source)和终点(target)' }
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return { isValid: false, error: '连线指向了画布中不存在的节点，数据可能已损坏' }
    }
  }

  return { isValid: true, isFullGraph }
}

/**
 * 生成导出或复制使用的标准统一 JSON 对象
 * @param {Object} options 配置对象
 * @param {Object} [options.graphs] 包含需要处理的图集合，具体格式为：
 *   {
 *     material?: { nodes: Array, edges: Array },
 *     simulation?: { nodes: Array, edges: Array },
 *     selection?: { nodes: Array, edges: Array }
 *   }
 * @param {Object} [options.projectSettings] 全局环境参数（如几何体、粒子数等）
 */
export function generateExportData({ graphs = {}, projectSettings = {} } = {}) {
  const cleanedGraphs = {}
  const validKeys = ['material', 'simulation', 'selection']

  for (const key of validKeys) {
    if (graphs[key]) {
      cleanedGraphs[key] = {
        nodes: cleanNodesForExport(graphs[key].nodes || []),
        edges: cleanEdgesForExport(graphs[key].edges || [])
      }
    }
  }

  return {
    version: '1.0.0',
    timestamp: Date.now(),
    projectSettings: { ...projectSettings },
    graphs: cleanedGraphs
  }
}

function cleanNodesForExport(nodes) {
  if (!Array.isArray(nodes)) return []
  return nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
    data: JSON.parse(JSON.stringify(node.data || {}))
  }))
}

function cleanEdgesForExport(edges) {
  if (!Array.isArray(edges)) return []
  return edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle
  }))
}

/**
 * 在增量导入或粘贴时，重新映射节点 ID、重定向连线关系并重定位其整体坐标
 * @param {Array} incomingNodes 要导入的原始节点数组
 * @param {Array} incomingEdges 要导入的原始连线数组
 * @param {Object} mousePos 投放的目标画布视口坐标 { x, y }
 * @returns {Object} { nodes: Array, edges: Array }
 */
export function remapAndRepositionGraph(incomingNodes, incomingEdges, mousePos) {
  const idMap = {}
  const now = Date.now()

  let minX = Infinity
  let minY = Infinity
  incomingNodes.forEach(node => {
    if (node.position.x < minX) minX = node.position.x
    if (node.position.y < minY) minY = node.position.y
  })

  let offsetX = 40
  let offsetY = 40
  if (mousePos && typeof mousePos.x === 'number' && typeof mousePos.y === 'number') {
    offsetX = mousePos.x - minX
    offsetY = mousePos.y - minY
  }

  const remappedNodes = incomingNodes.map((node, index) => {
    const randomSuffix = Math.random().toString(36).substring(2, 7)
    const newId = `node-${node.type}-${now}-${index}-${randomSuffix}`
    idMap[node.id] = newId

    return {
      id: newId,
      type: node.type,
      position: {
        x: Math.round(node.position.x + offsetX),
        y: Math.round(node.position.y + offsetY)
      },
      data: JSON.parse(JSON.stringify(node.data || {})),
      selected: true
    }
  })

  const remappedEdges = incomingEdges.map(edge => {
    const newSource = idMap[edge.source]
    const newTarget = idMap[edge.target]
    const newId = `vueflow__edge-${newSource}${edge.sourceHandle || ''}-${newTarget}${edge.targetHandle || ''}`

    return {
      id: newId,
      source: newSource,
      sourceHandle: edge.sourceHandle,
      target: newTarget,
      targetHandle: edge.targetHandle,
      selected: true
    }
  })

  return { nodes: remappedNodes, edges: remappedEdges }
}

/**
 * 提取节点图中被 textureSample 节点引用的贴图 ID 集合
 * @param {Object} exportData 导出的 JSON 对象数据
 * @returns {Set<string>}
 */
export function getUsedTextureIds(exportData) {
  const usedIds = new Set()
  if (!exportData || !exportData.graphs) return usedIds

  for (const key of Object.keys(exportData.graphs)) {
    const graph = exportData.graphs[key]
    if (graph && Array.isArray(graph.nodes)) {
      for (const node of graph.nodes) {
        if (node.type === 'textureSample') {
          const texId = node.data?.properties?.textureId
          if (texId) {
            usedIds.add(texId)
          }
        }
      }
    }
  }
  return usedIds
}

/**
 * 提取节点图中被引用且在给定贴图列表（或 exportData.assets.customTextures）中的贴图对象
 * @param {Object} exportData 导出的 JSON 对象数据
 * @param {Array} [customTextures] 可选的贴图列表，若不传则从 exportData.assets.customTextures 获取
 * @returns {Array} 过滤后实际使用的贴图对象数组
 */
export function getUsedTextures(exportData, customTextures = null) {
  const usedIds = getUsedTextureIds(exportData)
  const textures = customTextures || exportData?.assets?.customTextures || []
  return textures.filter(tex => usedIds.has(tex.id))
}

/**
 * 导出项目配置为 JSON 下载
 * @param {Object} exportData 导出的 JSON 对象数据
 * @param {string} filename 文件名称
 */
export function exportAsJSON(exportData, filename) {
  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.json`
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * 打包项目配置和自定义资产并压缩为 ZIP 导出
 * @param {Object} exportData 导出的 JSON 对象数据
 * @param {string} filename 导出的压缩包名称
 * @param {Array<{id: string, name: string, file: File|Blob}>} usedCustomTextures 使用的自定义贴图资产列表
 * @param {File|Blob|null} customModelFile 自定义模型二进制文件或 Blob
 */
export async function exportAsZip(exportData, filename, usedCustomTextures = [], customModelFile = null) {
  const zip = new JSZip()
  const usedPaths = new Set()

  // 1. 打包自定义贴图
  const customTexturesMeta = usedCustomTextures.map(tex => {
    let fileName = tex.name || 'texture.png'
    let path = `assets/textures/${fileName}`
    let counter = 1
    while (usedPaths.has(path)) {
      const dotIdx = fileName.lastIndexOf('.')
      const base = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName
      const ext = dotIdx !== -1 ? fileName.substring(dotIdx) : ''
      path = `assets/textures/${base}_${counter}${ext}`
      counter++
    }
    usedPaths.add(path)

    zip.file(path, tex.file)

    return {
      id: tex.id,
      name: tex.name,
      path: path
    }
  })

  // 2. 打包自定义模型
  let customModelMeta = null
  if (customModelFile) {
    const modelPath = 'assets/model/model.glb'
    zip.file(modelPath, customModelFile)
    customModelMeta = {
      name: customModelFile.name || 'model.glb',
      path: modelPath
    }
  }

  // 3. 注入元数据
  if (customTexturesMeta.length > 0 || customModelMeta) {
    const assets = exportData.assets || {}
    if (customTexturesMeta.length > 0) {
      assets.customTextures = customTexturesMeta
    }
    if (customModelMeta) {
      assets.customModel = customModelMeta
    }
    exportData.assets = assets
  }

  // 4. 打包 json
  const jsonStr = JSON.stringify(exportData, null, 2)
  zip.file('shadergraph.json', jsonStr)

  // 5. 压缩下载
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
