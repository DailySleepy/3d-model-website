import { ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useShaderGraphStore } from '../stores/shaderGraph.js'
import { nodeRegistry } from '@/rendering/nodeRegistry'

export function useGraphConnectionUX() {
  const store = useShaderGraphStore()
  const { getSelectedNodes } = useVueFlow()

  const currentTempEdge = ref(null)
  const currentTempInsert = ref(null)
  let cachedOtherHandles = []
  let cachedEdges = []
  let lastDragCheckTime = 0

  const getEmptySlots = (slots, lutMap, nodeId, properties) => {
    return slots.filter(slot => {
      let visible = true
      if (typeof slot.visible === 'function') {
        visible = slot.visible(properties || {})
      }
      if (!visible) return false
      return !lutMap || !lutMap.has(`${nodeId}_${slot.id}`)
    })
  }

  const getClosestSlot = (nodeId, emptySlots, linePoints) => {
    let minDistSq = Infinity
    let bestSlotId = null

    emptySlots.forEach(slot => {
      const handleDOM = document.querySelector(`.vue-flow__node[data-id="${nodeId}"] .vue-flow__handle[id="${slot.id}"], .vue-flow__node[data-id="${nodeId}"] .vue-flow__handle[data-handleid="${slot.id}"]`)
      if (!handleDOM) return
      const rect = handleDOM.getBoundingClientRect()
      const hx = rect.left + rect.width / 2
      const hy = rect.top + rect.height / 2

      let localMinDistSq = Infinity
      for (const pt of linePoints) {
        const dSq = (hx - pt.x) ** 2 + (hy - pt.y) ** 2
        if (dSq < localMinDistSq) {
          localMinDistSq = dSq
        }
      }

      if (localMinDistSq < minDistSq) {
        minDistSq = localMinDistSq
        bestSlotId = slot.id
      }
    })

    return bestSlotId
  }

  const updateHasTempEdgeFlag = () => {
    store.hasTempEdge = !!(currentTempEdge.value || currentTempInsert.value)
  }

  const clearTempEdge = () => {
    if (currentTempEdge.value) {
      store.currentEdges = store.currentEdges.filter(e => e.id !== currentTempEdge.value.id)
      currentTempEdge.value = null
      updateHasTempEdgeFlag()
    }
  }

  const clearTempInsert = () => {
    if (currentTempInsert.value) {
      const info = currentTempInsert.value
      currentTempInsert.value = null
      const originalEdge = store.currentEdges.find(e => e.id === info.originalEdgeId)
      if (originalEdge) {
        originalEdge.style = info.originalStyle || undefined
      }
      store.currentEdges = store.currentEdges.filter(e => e.id !== info.tempEdgeId1 && e.id !== info.tempEdgeId2)
      updateHasTempEdgeFlag()
    }
  }

  const isValidConnection = (connection) => {
    if (connection.source === connection.target) return false

    const sourceNode = store.nodesLUT.get(connection.source)
    const targetNode = store.nodesLUT.get(connection.target)
    if (!sourceNode || !targetNode) return false

    const sourceConfig = nodeRegistry[sourceNode.type]
    const targetConfig = nodeRegistry[targetNode.type]
    if (!sourceConfig || !targetConfig) return false

    // 判断插槽是输入还是输出
    const isSourceInput = sourceConfig.inputs?.some(i => i.id === connection.sourceHandle)
    const isSourceOutput = sourceConfig.outputs?.some(o => o.id === connection.sourceHandle)
    const isTargetInput = targetConfig.inputs?.some(i => i.id === connection.targetHandle)
    const isTargetOutput = targetConfig.outputs?.some(o => o.id === connection.targetHandle)

    // 必须一个是输出端口，一个是输入端口
    const isValidDirection = (isSourceOutput && isTargetInput) || (isSourceInput && isTargetOutput)
    if (!isValidDirection) return false

    return true
  }

  const onNodeDragStart = ({ event, node }) => {
    store.takeSnapshot()

    const selectedNodes = getSelectedNodes.value
    if (selectedNodes.length !== 1) {
      cachedOtherHandles = []
      cachedEdges = []
      return
    }

    // 1. 被拖拽节点以外的 handle 数据缓存
    const otherHandlesDOM = document.querySelectorAll(`.vue-flow__node:not([data-id="${node.id}"]) .vue-flow__handle`)
    cachedOtherHandles = Array.from(otherHandlesDOM).map(handle => {
      const rect = handle.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const isSource = handle.classList.contains('source')
      const handleId = handle.getAttribute('data-handleid') || handle.getAttribute('id') || handle.getAttribute('data-id')
      const nodeEl = handle.closest('.vue-flow__node')
      const nodeId = nodeEl ? nodeEl.getAttribute('data-id') : null

      return {
        x,
        y,
        isSource,
        handleId,
        nodeId
      }
    }).filter(h => h.nodeId && h.handleId)

    // 2. 被拖拽节点以外的连线数据缓存
    const edgePaths = document.querySelectorAll('.vue-flow__edge-path')
    cachedEdges = Array.from(edgePaths).map(edgePath => {
      const edgeEl = edgePath.closest('.vue-flow__edge')
      const edgeId = edgeEl ? edgeEl.getAttribute('data-id') : null
      if (!edgeId) return null

      const edge = store.currentEdges.find(e => e.id === edgeId)
      if (!edge || edge.source === node.id || edge.target === node.id || edge.isTemp) return null

      const edgeRect = edgePath.getBoundingClientRect()
      const length = edgePath.getTotalLength()
      const ctm = edgePath.getScreenCTM()
      if (!ctm) return null
      const originalStyle = edge.style ? { ...edge.style } : null

      const linePoints = []
      const samples = 12
      for (let i = 0; i <= samples; i++) {
        const distOnPath = (length * i) / samples
        const pt = edgePath.getPointAtLength(distOnPath)
        const clientX = pt.x * ctm.a + pt.y * ctm.c + ctm.e
        const clientY = pt.x * ctm.b + pt.y * ctm.d + ctm.f
        linePoints.push({ x: clientX, y: clientY })
      }

      return {
        edgeId,
        edge,
        edgeRect,
        length,
        ctm,
        edgePath,
        originalStyle,
        linePoints
      }
    }).filter(Boolean)
  }

  const onNodeDrag = ({ event, node }) => {
    const selectedNodes = getSelectedNodes.value
    if (selectedNodes.length !== 1) {
      clearTempEdge()
      clearTempInsert()
      return
    }

    // 限流 (30 fps)
    const now = performance.now()
    if (now - lastDragCheckTime < 32) return
    lastDragCheckTime = now

    const draggedHandles = document.querySelectorAll(`.vue-flow__node[data-id="${node.id}"] .vue-flow__handle`)

    const minDistance = 50
    let minDistanceSq = minDistance ** 2
    let bestPair = null

    draggedHandles.forEach(h1 => {
      const isH1Source = h1.classList.contains('source')
      const id1 = h1.getAttribute('data-handleid') || h1.getAttribute('id') || h1.getAttribute('data-id')
      const rect1 = h1.getBoundingClientRect()
      const x1 = rect1.left + rect1.width / 2
      const y1 = rect1.top + rect1.height / 2

      cachedOtherHandles.forEach(h2 => {
        if (isH1Source === h2.isSource) return // 必须一进一出

        const distSq = (x1 - h2.x) ** 2 + (y1 - h2.y) ** 2
        if (distSq >= minDistanceSq) return

        const connection = isH1Source
          ? { source: node.id, sourceHandle: id1, target: h2.nodeId, targetHandle: h2.handleId }
          : { source: h2.nodeId, sourceHandle: h2.handleId, target: node.id, targetHandle: id1 }

        if (!isValidConnection(connection)) return

        minDistanceSq = distSq
        bestPair = connection
      })
    })

    if (bestPair) {
      clearTempInsert()
      const tempEdgeId = `vueflow__edge-temp-${bestPair.source}${bestPair.sourceHandle || ''}-${bestPair.target}${bestPair.targetHandle || ''}`

      if (!currentTempEdge.value || currentTempEdge.value.id !== tempEdgeId) {
        clearTempEdge()

        const tempEdge = {
          id: tempEdgeId,
          source: bestPair.source,
          sourceHandle: bestPair.sourceHandle,
          target: bestPair.target,
          targetHandle: bestPair.targetHandle,
          isTemp: true,
          style: { strokeDasharray: '5 5', opacity: 0.6, stroke: '#a1a1aa' }
        }

        currentTempEdge.value = tempEdge
        store.currentEdges = [...store.currentEdges, tempEdge]
        updateHasTempEdgeFlag()
      }
    } else {
      clearTempEdge()

      const nodeDOM = document.querySelector(`.vue-flow__node[data-id="${node.id}"]`)
      const nodeConfig = nodeRegistry[node.type]
      if (!nodeDOM || !nodeConfig || !nodeConfig.inputs || !nodeConfig.outputs) {
        clearTempInsert()
        return
      }

      // 获取当前可见的空闲输入与输出插槽
      const properties = node.data.properties || {}
      const emptyInputs = getEmptySlots(nodeConfig.inputs, store.inputEdgesLUT, node.id, properties)
      const emptyOutputs = getEmptySlots(nodeConfig.outputs, store.outputEdgesLUT, node.id, properties)

      if (emptyInputs.length === 0 || emptyOutputs.length === 0) {
        clearTempInsert()
        return
      }

      const nodeRect = nodeDOM.getBoundingClientRect()
      let overlappingEdge = null
      let bestInputSlotId = null
      let bestOutputSlotId = null

      for (const item of cachedEdges) {
        const edgeRect = item.edgeRect
        const isAABBIntersect = !(
          edgeRect.left > nodeRect.right ||
          edgeRect.right < nodeRect.left ||
          edgeRect.top > nodeRect.bottom ||
          edgeRect.bottom < nodeRect.top
        )
        if (!isAABBIntersect) continue

        let isOverlapping = false

        for (const pt of item.linePoints) {
          if (
            pt.x >= nodeRect.left &&
            pt.x <= nodeRect.right &&
            pt.y >= nodeRect.top &&
            pt.y <= nodeRect.bottom
          ) {
            isOverlapping = true
            break
          }
        }

        if (isOverlapping) {
          overlappingEdge = item.edge

          // 计算最近的空闲输入和输出插槽
          bestInputSlotId = getClosestSlot(node.id, emptyInputs, item.linePoints)
          bestOutputSlotId = getClosestSlot(node.id, emptyOutputs, item.linePoints)

          break
        }
      }

      if (overlappingEdge && bestInputSlotId && bestOutputSlotId) {
        const oEdgeId = overlappingEdge.id
        const matchedItem = cachedEdges.find(item => item.edgeId === oEdgeId)
        const originalStyle = matchedItem ? matchedItem.originalStyle : null

        if (
          !currentTempInsert.value ||
          currentTempInsert.value.originalEdgeId !== oEdgeId ||
          currentTempInsert.value.inSlotId !== bestInputSlotId ||
          currentTempInsert.value.outSlotId !== bestOutputSlotId
        ) {
          clearTempInsert()

          const realEdge = store.currentEdges.find(e => e.id === oEdgeId)
          if (realEdge) {
            realEdge.style = { ...originalStyle, opacity: 0.15, strokeDasharray: '2 2' }
          }

          const tempId1 = `vueflow__edge-temp-insert-1-${oEdgeId}`
          const tempId2 = `vueflow__edge-temp-insert-2-${oEdgeId}`

          const tempEdge1 = {
            id: tempId1,
            source: overlappingEdge.source,
            sourceHandle: overlappingEdge.sourceHandle,
            target: node.id,
            targetHandle: bestInputSlotId,
            isTemp: true,
            style: { strokeDasharray: '5 5', opacity: 0.6, stroke: '#a1a1aa' }
          }

          const tempEdge2 = {
            id: tempId2,
            source: node.id,
            sourceHandle: bestOutputSlotId,
            target: overlappingEdge.target,
            targetHandle: overlappingEdge.targetHandle,
            isTemp: true,
            style: { strokeDasharray: '5 5', opacity: 0.6, stroke: '#a1a1aa' }
          }

          currentTempInsert.value = {
            originalEdgeId: oEdgeId,
            originalStyle,
            tempEdgeId1: tempId1,
            tempEdgeId2: tempId2,
            inSlotId: bestInputSlotId,
            outSlotId: bestOutputSlotId
          }

          store.currentEdges = [...store.currentEdges, tempEdge1, tempEdge2]
          updateHasTempEdgeFlag()
        }
      } else {
        clearTempInsert()
      }
    }
  }

  const onNodeDragStop = ({ event, node }) => {
    const selectedNodes = getSelectedNodes.value
    if (selectedNodes.length !== 1) {
      clearTempEdge()
      clearTempInsert()
      return
    }

    if (currentTempEdge.value) {
      const temp = currentTempEdge.value
      currentTempEdge.value = null
      updateHasTempEdgeFlag()

      store.currentEdges = store.currentEdges.filter(e => e.id !== temp.id)

      store.addConnection({
        source: temp.source,
        sourceHandle: temp.sourceHandle,
        target: temp.target,
        targetHandle: temp.targetHandle
      })
      return
    }

    if (currentTempInsert.value) {
      const info = currentTempInsert.value
      currentTempInsert.value = null
      updateHasTempEdgeFlag()

      const originalEdge = store.currentEdges.find(e => e.id === info.originalEdgeId)
      if (originalEdge) {
        originalEdge.style = info.originalStyle || undefined
      }
      store.currentEdges = store.currentEdges.filter(e => e.id !== info.tempEdgeId1 && e.id !== info.tempEdgeId2)

      if (info.inSlotId && info.outSlotId) {
        store.insertNodeOnEdge(node.id, info.originalEdgeId, info.inSlotId, info.outSlotId)
      }
      return
    }
  }

  return {
    currentTempEdge,
    currentTempInsert,
    isValidConnection,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    clearTempEdge,
    clearTempInsert,
    updateHasTempEdgeFlag
  }
}
