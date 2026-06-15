import * as tsl from 'three/tsl';
import { nodeRegistry, getSocketDefaultNode, SEMANTIC_TO_DATA_TYPE } from './nodeRegistry';

export class CompilerContext {
  uniforms
  #nodes
  #reverseEdgeLUT = new Map()
  #outputCache = new Map()

  constructor(nodes, edges, uniforms = {}) {
    console.log("nodes", nodes)
    console.log("edges", edges)
    this.uniforms = uniforms
    this.#nodes = nodes
    this.#buildReverseEdgeLUT(nodes, edges)
  }

  #buildKey(nodeId, socketId) {
    return `${nodeId}_${socketId}`
  }

  #buildReverseEdgeLUT(nodes, edges) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source)
      if (sourceNode) {
        this.#reverseEdgeLUT.set(this.#buildKey(edge.target, edge.targetHandle), {
          sourceNode: sourceNode,
          sourceSocketId: edge.sourceHandle
        })
      }
    }
  }

  /**
   * 使用节点类型 (如 'mat-output') 创建一个输入抓取器, 之后向抓取器传入 socketId (如 'in-color') 获取 three/nodes
   * @param {string} nodeType
   */
  createInputFetcher(nodeType) {
    const vueNode = this.#nodes.find(n => n.type === nodeType)
    if (!vueNode) return null
    return (inputSocketId) => this.#resolveInput(vueNode, inputSocketId).node
  }

  #resolveInput(vueNode, inputSocketId) {
    const edgeInfo = this.#reverseEdgeLUT.get(this.#buildKey(vueNode.id, inputSocketId))

    // 插槽未连接, 返回默认值
    if (!edgeInfo) {
      const nodeConfig = nodeRegistry[vueNode.type]
      const inputConfig = nodeConfig?.inputs?.find(input => input.id === inputSocketId)
      const rawType = typeof inputConfig?.defaultType === 'function' ? inputConfig.defaultType(vueNode.data?.properties) : (inputConfig?.defaultType || 'float')
      const type = SEMANTIC_TO_DATA_TYPE[rawType] || rawType || 'float'
      const node = inputConfig ? getSocketDefaultNode(inputConfig, vueNode) : tsl.float(0.0)
      return { node, type }
    }

    // 有连线, 追踪到上游
    const sourceNode = edgeInfo.sourceNode
    const sourceSocketId = edgeInfo.sourceSocketId
    const cacheKey = this.#buildKey(sourceNode.id, sourceSocketId)

    if (this.#outputCache.has(cacheKey)) {
      return this.#outputCache.get(cacheKey)
    }

    const sourceNodeConfig = nodeRegistry[sourceNode.type]
    if (!sourceNodeConfig) {
      return { node: tsl.float(0.0), type: 'float' }
    }

    const inputProxy = {
      compiledNode: (socketId) => this.#resolveInput(sourceNode, socketId).node,
      type: (socketId) => this.#resolveInput(sourceNode, socketId).type
    }

    const compiledNode = sourceNodeConfig.compile({
      nodeId: sourceNode.id,
      nodeProps: sourceNode.data?.properties,
      outputSocketId: sourceSocketId,
      inputs: inputProxy,
      uniforms: this.uniforms,
    })

    const inferredType = sourceNodeConfig.inferType({
      nodeProps: sourceNode.data?.properties,
      outputSocketId: sourceSocketId,
      inputs: inputProxy
    })

    const result = { node: compiledNode, type: inferredType }
    this.#outputCache.set(cacheKey, result)
    return result
  }
}
