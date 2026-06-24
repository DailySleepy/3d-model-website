import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useShaderGraphStore } from '../stores/shaderGraph'
import { generateExportData, remapAndRepositionGraph, useGraphIO } from './useGraphIO'

export function useGraphShortCuts({ openSearchMenu }) {
  const snapToGrid = ref(false)

  const store = useShaderGraphStore()
  const { handleClipboardPaste } = useGraphIO()
  const { getSelectedNodes, getSelectedEdges, project, addNodes, addEdges, removeNodes, removeEdges } = useVueFlow()

  const mousePos = {}
  const trackMousePos = (e) => {
    mousePos.clientX = e.clientX
    mousePos.clientY = e.clientY
  }

  const getProjectedMousePos = () => {
    const rect = store.graphCanvasDOM?.getBoundingClientRect()
    const canvasX = mousePos.clientX - (rect ? rect.left : 0)
    const canvasY = mousePos.clientY - (rect ? rect.top : 0)
    return project({ x: canvasX, y: canvasY })
  }

  const handleGlobalKeyDown = async (e) => {
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

    // Ctrl + C: 复制节点到剪切板
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault()
      const subgraph = store.getSelectedSubgraph()
      if (!subgraph.nodes || subgraph.nodes.length === 0) return
      const exportData = generateExportData({ graphs: { selection: subgraph } })
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
    }

    // Ctrl + V: 粘贴
    if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
      e.preventDefault()
      navigator.clipboard.readText().then(text => {
        handleClipboardPaste(text, getProjectedMousePos())
      })
    }

    // Ctrl + D: 复制选中的节点到鼠标光标位置
    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()

      const subgraph = store.getSelectedSubgraph()
      if (!subgraph.nodes || subgraph.nodes.length === 0) return
      const { nodes: newNodes, edges: newEdges } = remapAndRepositionGraph(
        subgraph.nodes, subgraph.edges,
        getProjectedMousePos()
      )

      getSelectedNodes.value.forEach(node => {
        node.selected = false
      })
      getSelectedEdges.value.forEach(edge => {
        edge.selected = false
      })

      addNodes(newNodes)
      await nextTick()
      addEdges(newEdges)

      return
    }

    // Delete 键 / Backspace 键 / X 键: 删除选中的节点 and 连线
    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')
      const selectedEdges = getSelectedEdges.value

      if (selectedNodes.length > 0) {
        removeNodes(selectedNodes)
      }
      if (selectedEdges.length > 0) {
        removeEdges(selectedEdges)
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
