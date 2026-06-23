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

  const keysToCheck = importMode === 'all'
    ? ['material', 'simulation']
    : [activeTab]

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
    projectSettings: data.projectSettings || null
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
 * @param {Object} [options.globalSettings] 全局环境参数（如几何体、粒子数等）
 */
export function generateExportData({ graphs = {}, globalSettings = {} } = {}) {
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
    globalSettings: {
      particleCount: globalSettings?.particleCount,
      selectedGeometry: globalSettings?.selectedGeometry
    },
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
