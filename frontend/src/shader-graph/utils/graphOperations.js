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

const parseBezierPoints = (d) => {
  if (!d) return null
  const nums = d.match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g)
  if (!nums || nums.length < 8) return null
  return {
    x0: parseFloat(nums[0]), y0: parseFloat(nums[1]),
    x1: parseFloat(nums[2]), y1: parseFloat(nums[3]),
    x2: parseFloat(nums[4]), y2: parseFloat(nums[5]),
    x3: parseFloat(nums[6]), y3: parseFloat(nums[7]),
  }
}

export const performCut = (store, cutPoints) => {
  if (!cutPoints || cutPoints.length < 2) return

  // 1. 计算切线轨迹的屏幕 AABB 包围盒 (外扩 8px 容差)
  let minCutX = Infinity, maxCutX = -Infinity, minCutY = Infinity, maxCutY = -Infinity
  for (let i = 0; i < cutPoints.length; i++) {
    const p = cutPoints[i]
    if (p.x < minCutX) minCutX = p.x
    if (p.x > maxCutX) maxCutX = p.x
    if (p.y < minCutY) minCutY = p.y
    if (p.y > maxCutY) maxCutY = p.y
  }
  const pad = 8
  minCutX -= pad
  maxCutX += pad
  minCutY -= pad
  maxCutY += pad

  const edgePaths = document.querySelectorAll('.vue-flow__edge-path')
  const edgesToRemove = new Set()

  edgePaths.forEach(edgePath => {
    const edgeEl = edgePath.closest('.vue-flow__edge')
    const edgeId = edgeEl ? edgeEl.getAttribute('data-id') : null
    if (!edgeId || edgeId.includes('temp')) return

    const ctm = edgePath.getScreenCTM()
    if (!ctm) return

    // 2. 利用 Y 单调性与 X 凸包定理确定 AABB, 避免 getBoundingClientRect DOM 回流
    let rectMinX, rectMaxX, rectMinY, rectMaxY
    const pts = parseBezierPoints(edgePath.getAttribute('d'))

    if (pts) {
      // Y 轴单调性: 最值严格由端点 y0 与 y3 决定
      const localMinY = Math.min(pts.y0, pts.y3)
      const localMaxY = Math.max(pts.y0, pts.y3)
      // X 轴凸包性: 最值必落在 4 个控制点的凸包内
      const localMinX = Math.min(pts.x0, pts.x1, pts.x2, pts.x3)
      const localMaxX = Math.max(pts.x0, pts.x1, pts.x2, pts.x3)

      const s1X = localMinX * ctm.a + localMinY * ctm.c + ctm.e
      const s1Y = localMinX * ctm.b + localMinY * ctm.d + ctm.f
      const s2X = localMaxX * ctm.a + localMaxY * ctm.c + ctm.e
      const s2Y = localMaxX * ctm.b + localMaxY * ctm.d + ctm.f

      rectMinX = Math.min(s1X, s2X)
      rectMaxX = Math.max(s1X, s2X)
      rectMinY = Math.min(s1Y, s2Y)
      rectMaxY = Math.max(s1Y, s2Y)
    } else {
      // 非标准曲线 fallback
      const r = edgePath.getBoundingClientRect()
      rectMinX = r.left; rectMaxX = r.right; rectMinY = r.top; rectMaxY = r.bottom
    }

    // AABB 快速排除
    if (rectMaxX < minCutX || rectMinX > maxCutX || rectMaxY < minCutY || rectMinY > maxCutY) {
      return
    }

    // 3. 采样判定与 Y 轴单调性 Early-Exit
    const totalLength = edgePath.getTotalLength()
    if (totalLength === 0) return

    // 每 12px 进行一次采样
    const samples = Math.max(2, Math.floor(totalLength / 12))

    // 确定连线在屏幕视口中的 Y 轴单调走向
    const startPt = edgePath.getPointAtLength(0)
    const startY = startPt.x * ctm.b + startPt.y * ctm.d + ctm.f
    const endPt = edgePath.getPointAtLength(totalLength)
    const endY = endPt.x * ctm.b + endPt.y * ctm.d + ctm.f
    const isYSortedAscending = startY <= endY

    let intersected = false

    for (let i = 0; i <= samples; i++) {
      const dist = (totalLength * i) / samples
      const pt = edgePath.getPointAtLength(dist)
      const curX = pt.x * ctm.a + pt.y * ctm.c + ctm.e
      const curY = pt.x * ctm.b + pt.y * ctm.d + ctm.f

      // 单调性 Early-Exit: 一旦超出切线垂直区间, 后续点不可能相交, 立即终止
      if (isYSortedAscending) {
        if (curY > maxCutY) break
      } else {
        if (curY < minCutY) break
      }

      // 距离判定
      for (let j = 0; j < cutPoints.length - 1; j++) {
        const p1 = cutPoints[j]
        const p2 = cutPoints[j + 1]

        if (getSquaredDistancePointToSegment(curX, curY, p1.x, p1.y, p2.x, p2.y) < 64) {
          intersected = true
          break
        }
      }

      if (intersected) break
    }

    if (intersected) {
      edgesToRemove.add(edgeId)
    }
  })

  if (edgesToRemove.size > 0) {
    const prevCount = store.currentEdges.length
    const nextEdges = store.currentEdges.filter(e => !edgesToRemove.has(e.id))
    if (nextEdges.length !== prevCount) {
      store.takeSnapshot()
      store.currentEdges = nextEdges
      store.compileActiveTab()
    }
  }
}

