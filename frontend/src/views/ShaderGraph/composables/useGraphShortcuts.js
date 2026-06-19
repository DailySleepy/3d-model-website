import { onMounted, onUnmounted, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry.js'

export function useGraphShortCuts({ canvasRef, nodes, openSearchMenu }) {
  const snapToGrid = ref(false)

  const { getSelectedNodes, addNodes, removeNodes } = useVueFlow()

  const mousePos = {}
  const trackMousePos = (e) => {
    mousePos.clientX = e.clientX
    mousePos.clientY = e.clientY
  }

  const handleGlobalKeyDown = (e) => {
    const activeEl = document.activeElement
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return
    }

    // Shift + A: 打开搜索菜单
    if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault()
      openSearchMenu(mousePos)
      return
    }

    // Shift + Tab: 网格吸附切换
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault()
      snapToGrid.value = !snapToGrid.value
    }

    // D: 原地平移克隆选中的节点
    if (e.key === 'd' || e.key === 'D') {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')

      if (selectedNodes.length > 0) {
        const clonedNodes = selectedNodes.map(node => {
          node.selected = false
          return {
            id: `node-${node.type}-${Date.now()}-${Math.random().toString().substring(2, 7)}`,
            type: node.type,
            position: { x: node.position.x + 30, y: node.position.y + 30 },
            data: JSON.parse(JSON.stringify(node.data)),
            selected: true
          }
        })
        addNodes(clonedNodes)
      }
      return
    }

    // X: 删除选中的节点
    if (e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')

      if (selectedNodes.length > 0) {
        const idsToRemove = selectedNodes.map(n => n.id)
        removeNodes(idsToRemove)
      }
      return
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', trackMousePos)
    window.addEventListener('keydown', handleGlobalKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', trackMousePos)
    window.removeEventListener('keydown', handleGlobalKeyDown)
  })

  return {
    snapToGrid
  }
}
