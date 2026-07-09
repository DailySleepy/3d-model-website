import { nodeRegistry } from '@/rendering/nodeRegistry'

const sortEdges = (store, edges, getNodeId, getHandleId, slotType) => {
  return [...edges].sort((a, b) => {
    const nodeA = store.nodesLUT.get(getNodeId(a))
    const nodeB = store.nodesLUT.get(getNodeId(b))
    if (!nodeA || !nodeB) return 0

    // 节点排列顺序排序
    // X 轴自左向右优先
    const diffX = (nodeA.position?.x || 0) - (nodeB.position?.x || 0)
    if (Math.abs(diffX) > 1e-4) return diffX
    // Y 轴自上向下优先
    const diffY = (nodeA.position?.y || 0) - (nodeB.position?.y || 0)
    if (Math.abs(diffY) > 1e-4) return diffY

    // 插槽定义顺序排序
    const config = nodeRegistry[nodeA.type]
    if (config && config[slotType]) {
      const idxA = config[slotType].findIndex(i => i.id === getHandleId(a))
      const idxB = config[slotType].findIndex(i => i.id === getHandleId(b))
      return idxA - idxB
    }
    return 0
  })
}

const performBypassBridgesMulti = (store, selectedSet) => {
  // 分流出边界和入边界的连线
  const incomingEdges = []
  const outgoingEdges = []

  store.currentEdges.forEach(edge => {
    const isSourceSelected = selectedSet.has(edge.source)
    const isTargetSelected = selectedSet.has(edge.target)

    if (!isSourceSelected && isTargetSelected) {
      incomingEdges.push(edge)
    } else if (isSourceSelected && !isTargetSelected) {
      outgoingEdges.push(edge)
    }
  })

  if (incomingEdges.length === 0 || outgoingEdges.length === 0) {
    return
  }

  const orderedIncoming = sortEdges(store, incomingEdges, e => e.target, e => e.targetHandle, 'inputs')
  const orderedOutgoing = sortEdges(store, outgoingEdges, e => e.source, e => e.sourceHandle, 'outputs')

  const matchCount = Math.min(orderedIncoming.length, orderedOutgoing.length)
  const newEdges = []

  for (let i = 0; i < matchCount; i++) {
    const inEdge = orderedIncoming[i]
    const outEdge = orderedOutgoing[i]

    newEdges.push({
      id: `vueflow__edge-${inEdge.source}${inEdge.sourceHandle || ''}-${outEdge.target}${outEdge.targetHandle || ''}`,
      source: inEdge.source,
      sourceHandle: inEdge.sourceHandle,
      target: outEdge.target,
      targetHandle: outEdge.targetHandle
    })
  }

  store.currentEdges = [...store.currentEdges, ...newEdges]
}

export const bypassAndRemoveNodes = (store, nodeIds) => {
  if (!nodeIds || nodeIds.length === 0) return

  store.takeSnapshot()

  const selectedSet = new Set(nodeIds)

  performBypassBridgesMulti(store, selectedSet)

  // 清除节点与连线
  store.currentNodes = store.currentNodes.filter(n => !selectedSet.has(n.id))
  store.currentEdges = store.currentEdges.filter(e => !selectedSet.has(e.source) && !selectedSet.has(e.target))

  store.compileActiveTab()
}

export const detachNodes = (store, nodeIds) => {
  if (!nodeIds || nodeIds.length === 0) return

  store.takeSnapshot()

  const selectedSet = new Set(nodeIds)

  performBypassBridgesMulti(store, selectedSet)

  // 仅断开与外部连通的连线，保留内部连线以及节点本身
  store.currentEdges = store.currentEdges.filter(e => selectedSet.has(e.source) === selectedSet.has(e.target))

  store.compileActiveTab()
}

export const swapInputEdges = (store, nodeId) => {
  const node = store.nodesLUT.get(nodeId)
  if (!node) return

  const nodeConfig = nodeRegistry[node.type]
  if (!nodeConfig || !nodeConfig.inputs) return

  const activeInputs = nodeConfig.inputs.map(input => {
    const edge = store.inputEdgesLUT.get(`${nodeId}_${input.id}`)
    return edge ? { slotId: input.id, edge } : null
  }).filter(Boolean)

  if (activeInputs.length < 2) {
    store.showToast('该节点需要至少有两个已连线的输入插槽才能进行交换', 'info', 1500)
    return
  }

  store.takeSnapshot()

  const slot1 = activeInputs[0].slotId
  const slot2 = activeInputs[1].slotId
  const edge1 = activeInputs[0].edge
  const edge2 = activeInputs[1].edge

  const newEdge1 = {
    ...edge1,
    targetHandle: slot2,
    id: `vueflow__edge-${edge1.source}${edge1.sourceHandle || ''}-${edge1.target}${slot2}`
  }

  const newEdge2 = {
    ...edge2,
    targetHandle: slot1,
    id: `vueflow__edge-${edge2.source}${edge2.sourceHandle || ''}-${edge2.target}${slot1}`
  }

  store.currentEdges = store.currentEdges.map(e => {
    if (e.id === edge1.id) return newEdge1
    if (e.id === edge2.id) return newEdge2
    return e
  })

  store.compileActiveTab()
}

const getVisibleOutputs = (node) => {
  const config = nodeRegistry[node.type]
  if (!config || !config.outputs) return []
  const props = node.data?.properties || {}
  return config.outputs.filter(slot => {
    if (typeof slot.visible === 'function') {
      return slot.visible(props)
    }
    return true
  })
}

const remapEdgesSource = (edges, sourceOutputs, targetOutputs, targetNodeId) => {
  return edges.map(edge => {
    const idx = sourceOutputs.findIndex(o => o.id === edge.sourceHandle)
    let newHandleId = edge.sourceHandle
    if (targetOutputs.length > 0) {
      const targetIdx = Math.max(0, Math.min(idx >= 0 ? idx : 0, targetOutputs.length - 1))
      newHandleId = targetOutputs[targetIdx].id
    }
    return {
      ...edge,
      source: targetNodeId,
      sourceHandle: newHandleId,
      id: `vueflow__edge-${targetNodeId}${newHandleId || ''}-${edge.target}${edge.targetHandle || ''}`
    }
  })
}

export const swapNodesOutputs = (store, nodeIdA, nodeIdB) => {
  const nodeA = store.nodesLUT.get(nodeIdA)
  const nodeB = store.nodesLUT.get(nodeIdB)
  if (!nodeA || !nodeB) return

  const edgesFromA = store.currentEdges.filter(e => e.source === nodeIdA)
  const edgesFromB = store.currentEdges.filter(e => e.source === nodeIdB)

  if (edgesFromA.length === 0 && edgesFromB.length === 0) {
    store.showToast('选中的节点上均没有输出连线', 'info', 1500)
    return
  }

  store.takeSnapshot()

  const outputsA = getVisibleOutputs(nodeA)
  const outputsB = getVisibleOutputs(nodeB)

  // 互换起点 source，并根据可见输出插槽进行对齐映射
  const remappedA = remapEdgesSource(edgesFromA, outputsA, outputsB, nodeIdB)
  const remappedB = remapEdgesSource(edgesFromB, outputsB, outputsA, nodeIdA)

  const remappedMap = new Map()
  edgesFromA.forEach((oldEdge, i) => {
    remappedMap.set(oldEdge.id, remappedA[i])
  })
  edgesFromB.forEach((oldEdge, i) => {
    remappedMap.set(oldEdge.id, remappedB[i])
  })

  store.currentEdges = store.currentEdges.map(e => {
    if (remappedMap.has(e.id)) {
      return remappedMap.get(e.id)
    }
    return e
  })

  store.compileActiveTab()
}

const getSquaredDistancePointToSegment = (px, py, x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) {
    const ndx = px - x1
    const ndy = py - y1
    return ndx * ndx + ndy * ndy
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy

  const cdx = px - closestX
  const cdy = py - closestY
  return cdx * cdx + cdy * cdy
}

export const performCut = (store, cutPoints) => {
  if (cutPoints.length < 2) return

  // 计算切线点集的包围盒
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  cutPoints.forEach(p => {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  })

  const pad = 8
  minX -= pad
  maxX += pad
  minY -= pad
  maxY += pad

  const edgePaths = document.querySelectorAll('.vue-flow__edge-path')
  const edgesToRemove = []

  edgePaths.forEach(edgePath => {
    const edgeEl = edgePath.closest('.vue-flow__edge')
    const edgeId = edgeEl ? edgeEl.getAttribute('data-id') : null
    if (!edgeId) return

    const edge = store.currentEdges.find(e => e.id === edgeId)
    if (!edge || edge.isTemp) return

    // 计算连线的包围盒
    const rect = edgePath.getBoundingClientRect()
    // AABB 包围盒初步过滤判定
    if (rect.right < minX || rect.left > maxX || rect.bottom < minY || rect.top > maxY) {
      return
    }

    // 细粒度相交采样判定
    const totalLength = edgePath.getTotalLength()
    const samples = Math.max(2, Math.floor(totalLength / 12))
    const ctm = edgePath.getScreenCTM()
    if (!ctm) return

    let intersected = false

    for (let i = 0; i <= samples; i++) {
      const distOnPath = (totalLength * i) / samples
      const pt = edgePath.getPointAtLength(distOnPath)

      const clientX = pt.x * ctm.a + pt.y * ctm.c + ctm.e
      const clientY = pt.x * ctm.b + pt.y * ctm.d + ctm.f

      for (let j = 0; j < cutPoints.length - 1; j++) {
        const p1 = cutPoints[j]
        const p2 = cutPoints[j + 1]

        const dSq = getSquaredDistancePointToSegment(clientX, clientY, p1.x, p1.y, p2.x, p2.y)
        if (dSq < 64) {
          intersected = true
          break
        }
      }
      if (intersected) break
    }

    if (intersected) {
      edgesToRemove.push(edgeId)
    }
  })

  if (edgesToRemove.length > 0) {
    store.takeSnapshot()
    store.currentEdges = store.currentEdges.filter(e => !edgesToRemove.includes(e.id))
    store.compileActiveTab()
  }
}

