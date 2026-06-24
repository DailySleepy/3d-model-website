import { nextTick } from 'vue'
import { generateExportData, parseGraphJSON, remapAndRepositionGraph } from "../utils/graphIO"
export { generateExportData, parseGraphJSON, remapAndRepositionGraph } from "../utils/graphIO"
import { useShaderGraphStore } from "../stores/shaderGraph"
import { confirmDialog } from '@/components/ConfirmDialog.vue'

export function useGraphIO() {
  const store = useShaderGraphStore()

  const handleImportFile = (file, mode) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      handleImportText(e.target.result, mode, null)
    }
    reader.readAsText(file)
  }

  /**
   * 解析并应用导入的项目/画布 JSON 节点图文件数据
   * 包含覆盖弹窗确认、全局参数同步、视角聚焦自适应
   * @param {string} text 导入的 JSON 字符串内容
   * @param {string} mode 导入模式 ('all' | 'current')
   */
  const handleImportText = async (text, mode) => {
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
    let matNodeCount = 0
    let simNodeCount = 0

    for (const graph of result.graphs) {
      const applyMode = graph.isFullGraph ? 'override' : 'append'
      const changed = await store.applyGraphData(graph.key, graph, applyMode, null)
      if (graph.key === 'material') {
        isMatChanged = changed
        if (changed) {
          matNodeCount = graph.nodes.length
        }
      }
      if (graph.key === 'simulation') {
        isSimChanged = changed
        if (changed) {
          simNodeCount = graph.nodes.length
        }
      }
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
      store.showToast(`成功导入 <b>材质画布</b>，共 <b>${matNodeCount}</b> 个节点`, "success")
    }

    const needCompileSim = isSimChanged || isParticleCountChanged
    if (needCompileSim) {
      store.compileSimulation()
    }
    if (isSimChanged) {
      store.showToast(`成功导入 <b>模拟画布</b>，共 <b>${simNodeCount}</b> 个节点`, "success")
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

  /**
   * 静默解析来自剪切板的节点数据并应用于当前画布
   * @param {string} text 剪切板文本
   * @param {Object} [mousePos] 已经画布投影过的目标坐标
   */
  const handleClipboardPaste = async (text, mousePos) => {
    if (!text) return

    // 1. 静默进行基本检验，若非合法 JSON 节点图则直接静默退出
    const result = parseGraphJSON(text, 'current', store.activeTab)
    if (!result.isValid) return

    // 2. 获取当前画布数据
    const activeTab = store.activeTab
    const graph = result.graphs.find(g => g.key === activeTab)
    if (!graph || !graph.nodes || graph.nodes.length === 0) return

    // 3. 粘贴永远强制为增量追加，并偏移坐标
    const changed = await store.applyGraphData(activeTab, graph, 'append', mousePos)

    if (changed) {
      // 4. 静默触发当前画布的编译
      if (activeTab === 'material') {
        store.compileMaterial()
      } else if (activeTab === 'simulation') {
        store.compileSimulation()
      }
    }
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
    processImportText: handleImportText,
    handleClipboardPaste,
    handleExportJSON,
    handleExportHTML
  }
}
