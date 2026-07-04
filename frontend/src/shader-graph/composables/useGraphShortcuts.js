import { useVueFlow } from '@vue-flow/core'
import { onMounted, onUnmounted, ref } from 'vue'
import { useShaderGraphStore } from '../stores/shaderGraph'
import { generateExportData, useGraphIO } from './useGraphIO'

export function useGraphShortCuts({ openSearchMenu }) {
  const snapToGrid = ref(false)

  const store = useShaderGraphStore()
  const { handleClipboardPaste } = useGraphIO()
  const { getSelectedNodes, getSelectedEdges, project } = useVueFlow()

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

    // Ctrl + Z: 撤销
    if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault()
      store.undo()
      return
    }

    // Ctrl + Shift + Z / Ctrl + Y: 重做
    if ((e.ctrlKey && (e.key === 'y' || e.key === 'Y')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')))
    {
      e.preventDefault()
      store.redo()
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

      store.cloneSubgraph(subgraph, getProjectedMousePos())
      return
    }

    // Delete 键 / Backspace 键 / X 键: 删除选中的节点 and 连线
    if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'x' || e.key === 'X') {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')
      const selectedEdges = getSelectedEdges.value

      store.removeElements(selectedNodes, selectedEdges)
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
