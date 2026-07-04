import { nodeRegistry } from "@/rendering/nodeRegistry"

/**
 * @param {string} type 节点类型 (如 'float', 'add' 等)
 * @param {{x: number, y: number}} position 画布中的网格投影坐标
 * @returns {Object|null} 标准的 Vue Flow 节点对象
 */
export const createNode = (type, position) => {
  const config = nodeRegistry[type]
  if (!config) return

  const properties = {}
  if (config.properties) {
    Object.entries(config.properties).forEach(([key, propSchema]) => {
      properties[key] = structuredClone(propSchema.default)
    })
  }

  const inputs = {}
  if (config.inputs) {
    config.inputs.forEach(socket => {
      const defaultValue = typeof socket.defaultValue === 'function'
        ? socket.defaultValue(properties)
        : socket.defaultValue
      inputs[socket.id] = defaultValue !== undefined ? structuredClone(defaultValue) : undefined
    })
  }

  return {
    id: `node-${type}-${Date.now()}-${Math.random().toString().substring(2, 7)}`, // TODO: better UID generation
    type: type,
    position: position,
    data: {
      label: config.label,
      category: config.category,
      properties,
      inputs
    }
  }
}
