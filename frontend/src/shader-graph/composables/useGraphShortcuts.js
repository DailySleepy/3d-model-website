import { useVueFlow } from '@vue-flow/core'
import { onMounted, onUnmounted, ref } from 'vue'
import { useShaderGraphStore } from '../stores/shaderGraph'
import { generateBaseExportData, useGraphIO } from './useGraphIO'
import { bypassAndRemoveNodes, detachNodes, swapInputEdges, swapNodesOutputs, performCut } from '../utils/graphOperations'

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

  const isCutting = ref(false)
  const cutPoints = ref([])
  let cuttingSvg = null
  let cuttingPath = null

  const createCuttingSvg = () => {
    if (cuttingSvg) return
    cuttingSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    cuttingSvg.setAttribute('class', 'cutting-canvas')

    cuttingPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    cuttingPath.setAttribute('class', 'cutting-line')

    cuttingSvg.appendChild(cuttingPath)
    document.body.appendChild(cuttingSvg)
  }

  const updateCuttingSvg = () => {
    if (!cuttingPath || cutPoints.value.length === 0) return
    const d = cutPoints.value.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    cuttingPath.setAttribute('d', d)
  }

  const removeCuttingSvg = () => {
    if (cuttingSvg) {
      cuttingSvg.remove()
      cuttingSvg = null
      cuttingPath = null
    }
  }

  const handleMouseDown = (e) => {
    if (e.ctrlKey && e.button === 2) {
      e.preventDefault()
      e.stopPropagation()
      isCutting.value = true
      cutPoints.value = [{ x: e.clientX, y: e.clientY }]
      createCuttingSvg()
      store.graphCanvasDOM?.classList.add('is-cutting')
    }
  }

  const handleMouseMove = (e) => {
    trackMousePos(e)
    if (isCutting.value) {
      // 检查鼠标右键是否依然按下 (e.buttons 的第 2 位对应右键)
      // 如果没有按下右键，说明在窗口外或由于其他原因已释放，立即终止切断逻辑并清理
      if ((e.buttons & 2) === 0) {
        isCutting.value = false
        cutPoints.value = []
        removeCuttingSvg()
        store.graphCanvasDOM?.classList.remove('is-cutting')
        return
      }
      cutPoints.value.push({ x: e.clientX, y: e.clientY })
      updateCuttingSvg()
    }
  }

  const handleMouseUp = (e) => {
    if (isCutting.value) {
      e.preventDefault()
      e.stopPropagation()
      isCutting.value = false
      performCut(store, cutPoints.value)
      cutPoints.value = []
      removeCuttingSvg()
      store.graphCanvasDOM?.classList.remove('is-cutting')
    }
  }

  const handleContextMenu = (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
    }
  }

  const handleWindowBlur = () => {
    if (isCutting.value) {
      isCutting.value = false
      cutPoints.value = []
      removeCuttingSvg()
      store.graphCanvasDOM?.classList.remove('is-cutting')
    }
  }

  const handleGlobalKeyUp = (e) => {

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
      const exportData = generateBaseExportData({ graphs: { selection: subgraph } })
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

    // Alt + X: 旁路删除所选节点，并对外部连线进行重连
    if (e.altKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')
      if (selectedNodes.length > 0) {
        bypassAndRemoveNodes(store, selectedNodes.map(n => n.id))
      }
      return
    }

    // Alt + B: 脱离所选节点，并对外部连线进行重连
    if (e.altKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value.filter(n => n.data.category !== 'OUTPUT')
      if (selectedNodes.length > 0) {
        detachNodes(store, selectedNodes.map(n => n.id))
      }
      return
    }

    // Alt + S: 选中 1 个节点时交换头两个活跃输入插槽，选中 2 个节点时交换这两个节点的所有输出连线
    if (e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      const selectedNodes = getSelectedNodes.value
      if (selectedNodes.length === 1) {
        swapInputEdges(store, selectedNodes[0].id)
      } else if (selectedNodes.length === 2) {
        swapNodesOutputs(store, selectedNodes[0].id, selectedNodes[1].id)
      }
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
    window.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('mousemove', handleMouseMove, true)
    window.addEventListener('mouseup', handleMouseUp, true)
    window.addEventListener('contextmenu', handleContextMenu, true)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('keyup', handleGlobalKeyUp)
    window.addEventListener('keydown', handleGlobalKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('mousedown', handleMouseDown, true)
    window.removeEventListener('mousemove', handleMouseMove, true)
    window.removeEventListener('mouseup', handleMouseUp, true)
    window.removeEventListener('contextmenu', handleContextMenu, true)
    window.removeEventListener('blur', handleWindowBlur)
    window.removeEventListener('keyup', handleGlobalKeyUp)
    window.removeEventListener('keydown', handleGlobalKeyDown)
    removeCuttingSvg()
  })

  return {
    snapToGrid
  }
}
