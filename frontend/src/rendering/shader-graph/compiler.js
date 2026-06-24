import * as tsl from 'three/tsl';
import { getSocketDefaultResult, nodeRegistry } from './nodeRegistry';

export class CompilerContext {
  uniforms
  #nodes
  #reverseEdgeLUT = new Map()
  #outputCache = new Map()
  #inputCache = new Map()

  constructor(nodes, edges, uniforms = {}) {
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
    const inputKey = this.#buildKey(vueNode.id, inputSocketId)
    if (this.#inputCache.has(inputKey)) {
      return this.#inputCache.get(inputKey)
    }

    const edgeInfo = this.#reverseEdgeLUT.get(inputKey)

    // 插槽未连接, 返回默认值
    if (!edgeInfo) {
      const result = getSocketDefaultResult(vueNode, inputSocketId)
      this.#inputCache.set(inputKey, result)
      return result
    }

    // 有连线, 追踪到上游
    const sourceNode = edgeInfo.sourceNode
    const sourceSocketId = edgeInfo.sourceSocketId
    const cacheKey = this.#buildKey(sourceNode.id, sourceSocketId)

    if (this.#outputCache.has(cacheKey)) {
      const result = this.#outputCache.get(cacheKey)
      this.#inputCache.set(inputKey, result)
      return result
    }

    const sourceNodeConfig = nodeRegistry[sourceNode.type]
    if (!sourceNodeConfig) {
      console.warn('Unexpected')
      const result = { node: tsl.float(0.0), type: 'float' }
      this.#inputCache.set(inputKey, result)
      return result
    }

    const inputProxy = {
      compiledNode: (socketId) => this.#resolveInput(sourceNode, socketId).node,
      type: (socketId) => this.#resolveInput(sourceNode, socketId).type,
      hasConnection: (socketId) => this.#reverseEdgeLUT.has(this.#buildKey(sourceNode.id, socketId))
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
    this.#inputCache.set(inputKey, result)
    return result
  }
}
