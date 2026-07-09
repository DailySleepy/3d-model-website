import { getDimension, nodeRegistry } from '@/rendering/nodeRegistry'

export const getSocketColor = (node, slotId, isInput) => {
  if (!node) return '#a1a1aa'
  const nodeConfig = nodeRegistry[node.type]
  if (!nodeConfig) return '#a1a1aa'

  const socket = isInput
    ? nodeConfig.inputs?.find(i => i.id === slotId)
    : nodeConfig.outputs?.find(o => o.id === slotId)

  if (!socket) return '#a1a1aa'

  if (socket.isDynamic) {
    return '#c084fc'
  }

  let type = socket.defaultType || 'float'
  if (typeof type === 'function') {
    type = type(node.data?.properties || {})
  }
  const dim = getDimension(type)
  const colors = {
    1: '#2aff82',
    2: '#33b5ff',
    3: '#ffea00',
    4: '#ff33aa'
  }
  return colors[dim] || '#a1a1aa'
}

export const getGradientId = (fromColor, toColor, activeTab) => {
  const fromClean = fromColor.replace('#', '')
  const toClean = toColor.replace('#', '')
  const prefix = activeTab ? `${activeTab}-` : ''
  return `edge-grad-${prefix}${fromClean}-${toClean}`
}
