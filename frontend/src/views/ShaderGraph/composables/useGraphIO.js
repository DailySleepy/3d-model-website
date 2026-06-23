import { nextTick } from 'vue'
import { generateExportData, parseGraphJSON, remapAndRepositionGraph } from "../utils/graphIO"
import { useShaderGraphStore } from "../stores/shaderGraph"
import { confirmDialog } from '@/components/ConfirmDialog.vue'

export function useGraphIO() {
  const store = useShaderGraphStore()

  const handleImportFile = (file, mode) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      processImportText(e.target.result, mode, null)
    }
    reader.readAsText(file)
  }

  const processImportText = async (text, mode, mousePos = null) => {
    const result = parseGraphJSON(text, mode, store.activeTab)
    if (!result.isValid) {
      store.showToast(result.error, 'error')
      return
    }

    if (result.hasFullGraph) {
      const confirmed = await confirmDialog({
        title: '导入完整节点图确认',
        type: 'warning',
        message: '检测到您导入的文件包含<b>完整节点配置</b>, 此操作将<span class="text-red-500 font-semibold">完全覆盖</span>对应画布的节点与连线数据',
        confirmText: '确认覆盖',
        cancelText: '取消'
      })
      if (!confirmed) return
    }

    // 应用图数据
    let isMatChanged = false
    let isSimChanged = false

    for (const graph of result.graphs) {
      const changed = await applyGraphData(graph, mousePos)
      if (graph.key === 'material') isMatChanged = changed
      if (graph.key === 'simulation') isSimChanged = changed
    }

    // 应用全局配置
    let isParticleCountChanged = false
    let isGeometryChanged = false
    const projectSettings = result.projectSettings
    if (projectSettings) {
      if (projectSettings.particleCount && projectSettings.particleCount !== store.particleCount) {
        store.particleCount = projectSettings.particleCount
        isParticleCountChanged = true
        await store.onParticleCountChange(false)
      }
      if (projectSettings.selectedGeometry && projectSettings.selectedGeometry !== store.selectedGeometry) {
        store.selectedGeometry = projectSettings.selectedGeometry
        isGeometryChanged = true
        await store.onGeometryChange(false)
      }
    }

    // 按需编译与提示
    const needCompileMat = isMatChanged || isParticleCountChanged || isGeometryChanged
    if (needCompileMat) {
      store.compileMaterial()
    }
    if (isMatChanged) {
      store.showToast("成功导入 <b>材质画布</b>", "success")
    }

    const needCompileSim = isSimChanged || isParticleCountChanged
    if (needCompileSim) {
      store.compileSimulation()
    }
    if (isSimChanged) {
      store.showToast("成功导入 <b>模拟画布</b>", "success")
    }

    // 处理期望的画布未发生变更或缺失的警告提示
    if (mode === 'all') {
      if (!isMatChanged) {
        store.showToast("材质画布未检测到有效的变更", "warning")
      }
      if (!isSimChanged) {
        store.showToast("模拟画布未检测到有效的变更", "warning")
      }
    } else {
      if (store.activeTab === 'material' && !isMatChanged) {
        store.showToast("材质画布未检测到有效的变更", "warning")
      } else if (store.activeTab === 'simulation' && !isSimChanged) {
        store.showToast("模拟画布未检测到有效的变更", "warning")
      }
    }

    await nextTick()
    store.fitCanvasView()
  }

  const applyGraphData = async (graph, mousePos) => {
    const { key, nodes, edges, isFullGraph } = graph
    if (!nodes || nodes.length === 0) return false

    let isChanged = false

    if (isFullGraph) {
      if (key === 'material') {
        store.matNodes = nodes
        store.matEdges = edges || []
        isChanged = true
      } else if (key === 'simulation') {
        store.simNodes = nodes
        store.simEdges = edges || []
        isChanged = true
      }
    } else {
      const { nodes: newNodes, edges: newEdges } = remapAndRepositionGraph(
        nodes, edges || [],
        key === store.activeTab ? mousePos : null
      )

      if (newNodes.length > 0) {
        if (key === 'material') {
          store.matNodes = [...store.matNodes, ...newNodes]
          store.matEdges = [...store.matEdges, ...newEdges]
          isChanged = true
        } else if (key === 'simulation') {
          store.simNodes = [...store.simNodes, ...newNodes]
          store.simEdges = [...store.simEdges, ...newEdges]
          isChanged = true
        }

        // 仅在当前激活的 Tab 增量导入时，把新节点设为选中，其他节点取消选中
        if (key === store.activeTab) {
          await nextTick()
          store.currentNodes.forEach(node => {
            node.selected = newNodes.some(n => n.id === node.id)
          })
          store.currentEdges.forEach(edge => {
            edge.selected = newEdges.some(e => e.id === edge.id)
          })
        }
      }
    }

    return isChanged
  }

  const handleExportJSON = (mode) => {
    let graphsToExport = {}
    let globalSettings = {}
    let filename = ''

    if (mode === 'current') {
      graphsToExport[store.activeTab] = {
        nodes: store.currentNodes,
        edges: store.currentEdges
      }
      globalSettings = {
        particleCount: store.particleCount,
        selectedGeometry: store.selectedGeometry
      }
      filename = `shadergraph-${store.activeTab}-${Date.now()}.json`
    }
    else if (mode === 'all') {
      graphsToExport["material"] = {
        nodes: store.matNodes,
        edges: store.matEdges
      }
      graphsToExport["simulation"] = {
        nodes: store.simNodes,
        edges: store.simEdges
      }
      globalSettings = {
        particleCount: store.particleCount,
        selectedGeometry: store.selectedGeometry
      }
      filename = `shadergraph-project-${Date.now()}.json`
    }
    else if (mode === 'selection') {
      graphsToExport["selection"] = store.getSelectedSubgraph()
      filename = `shadergraph-selection-${Date.now()}.json`
    }

    const exportData = generateExportData({ graphs: graphsToExport, globalSettings })

    if (!exportData) {
      store.showToast('导出文件失败', 'error')
      return
    }

    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()

    URL.revokeObjectURL(url)
    store.showToast('项目配置已成功导出并下载', 'success')
  }

  const handleExportHTML = (mode) => {
    // TODO
  }

  return {
    handleImportFile,
    processImportText,
    handleExportJSON,
    handleExportHTML
  }
}
