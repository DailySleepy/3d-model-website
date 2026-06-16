import { nodeRegistry } from "@/rendering/shader-graph/nodeRegistry"

/**
 * @param {string} type 节点类型 (如 'float', 'add' 等)
 * @param {{x: number, y: number}} position 画布中的网格投影坐标
 * @returns {Object|null} 标准的 Vue Flow 节点对象
 */
export const createNode = (type, position) => {
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
