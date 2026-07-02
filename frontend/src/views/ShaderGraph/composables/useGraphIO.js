import { nextTick } from 'vue'
import {
  generateExportData,
  parseGraphJSON,
  remapAndRepositionGraph,
  getUsedTextures,
  exportAsJSON,
  exportAsZip
} from "../utils/graphIO"
export {
  generateExportData,
  parseGraphJSON,
  remapAndRepositionGraph,
  getUsedTextures,
  exportAsJSON,
  exportAsZip
} from "../utils/graphIO"
import { useShaderGraphStore } from "../stores/shaderGraph"
import { confirmDialog } from '@/components/ConfirmDialog.vue'
import JSZip from 'jszip'

const backendBase = import.meta.env.VITE_API_BASE_URL || ''
const buildUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

export function useGraphIO() {
  const store = useShaderGraphStore()

  const handleImportFile = (file, mode) => {
    if (file.name.endsWith('.zip')) {
      handleImportZip(file, mode)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        handleImportText(e.target.result, mode)
      }
      reader.readAsText(file)
    }
  }

  const checkAndConfirmSimulation = async (parsedImportData, mode) => {
    if (mode === 'all' && parsedImportData.projectSettings?.enableSimulation === true && !store.enableSimulation) {
      const confirmed = await confirmDialog({
        title: '粒子模拟模式启用确认',
        type: 'warning',
        message: '检测到导入的项目包含粒子模拟，导入后将自动启用粒子模拟',
        confirmText: '确认启用',
        cancelText: '取消'
      })
      return confirmed
    }
    return true
  }

  const applyImportedTextData = async (parsedImportData, mode) => {
    // 应用全局配置 (仅在 mode === 'all' 且包含配置时同步)
    let isParticleCountChanged = false
    let isGeometryChanged = false
    const projectSettings = parsedImportData.projectSettings
    if (mode === 'all' && projectSettings) {
      const prevCount = store.particleCount
      const prevGeometry = store.selectedGeometry

      await store.updateProjectSettings(projectSettings, false)

      if (projectSettings.particleCount && projectSettings.particleCount !== prevCount) {
        isParticleCountChanged = true
      }
      if (projectSettings.selectedGeometry && projectSettings.selectedGeometry !== prevGeometry) {
        isGeometryChanged = true
      }
    }

    // 应用图数据
    let isMatChanged = false
    let isSimChanged = false
    let matNodeCount = 0
    let simNodeCount = 0

    for (const graph of parsedImportData.graphs) {
      const applyMode = graph.isFullGraph ? 'override' : 'append'
      const changed = await store.applyGraphData({
        targetTab: graph.key,
        graph,
        mode: applyMode,
        shouldCompile: false
      })
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
      if (parsedImportData.projectSettings?.enableSimulation && !isSimChanged) {
        store.showToast("模拟画布未检测到有效的变更", "warning")
      }
    } else {
      if (store.activeTab === 'material' && !isMatChanged) {
        store.showToast("材质画布未检测到有效的变更", "warning")
      } else if (store.activeTab === 'simulation' && !isSimChanged) {
        store.showToast("模拟画布未检测到有效的变更", "warning")
      }
    }

    store.fitCanvasView()
  }

  const handleImportZip = async (file, mode) => {
    let zip
    try {
      zip = await JSZip.loadAsync(file)
    } catch (e) {
      store.showToast('无法解析 zip 压缩包', 'error')
      return
    }

    const jsonFile = zip.file('shadergraph.json')
    if (!jsonFile) {
      store.showToast('无效的项目压缩包，未包含 shadergraph.json', 'error')
      return
    }

    let text
    try {
      text = await jsonFile.async('text')
    } catch (e) {
      store.showToast('读取 shadergraph.json 失败', 'error')
      return
    }

    const parsedImportData = parseGraphJSON(text, mode, store.activeTab)
    if (!parsedImportData.isValid) {
      store.showToast(parsedImportData.error, 'error')
      return
    }

    // 粒子模拟模式需要弹窗确认
    const ok = await checkAndConfirmSimulation(parsedImportData, mode)
    if (!ok) return

    // 确认导入不中断后，再解压并加载物理资产
    const assets = parsedImportData.assets || {}

    // 并发加载贴图资源
    const texturesMeta = assets.customTextures
    if (texturesMeta && texturesMeta.length > 0) {
      const loadPromises = texturesMeta.map(async (texMeta) => {
        const exists = store.customTextures.some(t => t.id === texMeta.id)
        if (exists) return

        const texFile = zip.file(texMeta.path)
        if (texFile) {
          const blob = await texFile.async('blob')
          await store.addCustomTextureFromBlob(blob, texMeta.name, texMeta.id, false)
        }
      })
      await Promise.all(loadPromises)
    }

    // 加载模型
    const modelMeta = assets.customModel
    let loadedModelFile = null
    if (modelMeta) {
      const modelFileInZip = zip.file(modelMeta.path)
      if (modelFileInZip) {
        const blob = await modelFileInZip.async('blob')
        loadedModelFile = new File([blob], modelMeta.name, { type: 'model/gltf-binary' })
      }
    }
    if (loadedModelFile) {
      store.onCustomModelUpload(loadedModelFile, false)
    }

    // 最终应用节点图数据
    await applyImportedTextData(parsedImportData, mode)
  }

  /**
   * 解析并应用导入的项目/画布 JSON 节点图文件数据
   * 包含覆盖弹窗确认、全局参数同步、视角聚焦自适应
   * @param {string} text 导入的 JSON 字符串内容
   * @param {string} mode 导入模式 ('all' | 'current')
   */
  const handleImportText = async (text, mode) => {
    const parsedImportData = parseGraphJSON(text, mode, store.activeTab)
    if (!parsedImportData.isValid) {
      store.showToast(parsedImportData.error, 'error')
      return
    }

    const ok = await checkAndConfirmSimulation(parsedImportData, mode)
    if (!ok) return

    await applyImportedTextData(parsedImportData, mode)
  }

  /**
   * 静默解析来自剪切板的节点数据并应用于当前画布
   * @param {string} text 剪切板文本
   * @param {Object} [mousePos] 已经画布投影过的目标坐标
   */
  const handleClipboardPaste = async (text, mousePos) => {
    if (!text) return

    const result = parseGraphJSON(text, 'current', store.activeTab)
    if (!result.isValid) return

    const activeTab = store.activeTab
    const graph = result.graphs.find(g => g.key === activeTab)
    if (!graph || !graph.nodes || graph.nodes.length === 0) return

    store.applyGraphData({
      targetTab: activeTab,
      graph,
      mode: 'append',
      mousePos
    })
  }

  /**
   * 导出当前的节点图逻辑到本地文件（支持 JSON 或打包 ZIP 导出）
   * @param {'current'|'all'|'selection'} mode 导出模式：'current' (当前画布), 'all' (整个项目配置), 'selection' (选中的子图)
   */
  const handleExportFile = async (mode) => {
    let graphsToExport = {}
    let projectSettings = {}
    let filename = ''

    if (mode === 'current') {
      graphsToExport[store.activeTab] = {
        nodes: store.currentNodes,
        edges: store.currentEdges
      }
      filename = `shadergraph-${store.activeTab}-${Date.now()}`
    }
    else if (mode === 'all') {
      graphsToExport["material"] = {
        nodes: store.matNodes,
        edges: store.matEdges
      }
      if (store.enableSimulation) {
        graphsToExport["simulation"] = {
          nodes: store.simNodes,
          edges: store.simEdges
        }
      }
      projectSettings = {
        particleCount: store.particleCount,
        selectedGeometry: store.selectedGeometry,
        enableSimulation: store.enableSimulation
      }
      filename = `shadergraph-project-${Date.now()}`
    }
    else if (mode === 'selection') {
      graphsToExport["selection"] = store.getSelectedSubgraph()
      filename = `shadergraph-selection-${Date.now()}`
    }

    const exportData = generateExportData({ graphs: graphsToExport, projectSettings })

    if (!exportData) {
      store.showToast('导出文件失败', 'error')
      return
    }

    let usedCustomTextures = []
    if (store.customTextures.length > 0) {
      usedCustomTextures = getUsedTextures(exportData, store.customTextures)
    }

    const hasCustomTextures = usedCustomTextures.length > 0
    const hasCustomModel = store.selectedGeometry === 'custom' && store.customModelFile

    let exportSuccess = false
    if (hasCustomTextures || hasCustomModel) {
      const modelFile = hasCustomModel ? store.customModelFile : null
      try {
        await exportAsZip(exportData, filename, usedCustomTextures, modelFile)
        store.showToast('项目配置及自定义资产已成功打包为 ZIP 导出', 'success')
        exportSuccess = true
      } catch (e) {
        store.showToast('生成 ZIP 失败', 'error')
      }
    } else {
      exportAsJSON(exportData, filename)
      store.showToast('项目配置已成功导出并下载', 'success')
      exportSuccess = true
    }

    if (exportSuccess && (mode === 'all' || mode === 'current')) {
      store.isDirty = false
    }
  }

  /**
   * 从已发布的 JSON 数据以及后端资产 URL 导出项目至本地
   * @param {string|Object} shaderGraphJson 节点图 JSON
   * @param {string} title 导出的项目标题
   * @param {string|null} modelFileUrl 自定义模型的相对/绝对路径
   * @param {Function} showToast 弹窗提示回调函数 (message, type) => void
   */
  const exportGraphFromModelDetail = async (shaderGraphJson, title, modelFileUrl, showToast) => {
    let exportData = null
    try {
      exportData = typeof shaderGraphJson === 'string'
        ? JSON.parse(shaderGraphJson)
        : JSON.parse(JSON.stringify(shaderGraphJson))
    } catch (e) {
      showToast('节点图数据解析失败', 'error')
      return
    }

    const projectSettings = exportData.projectSettings || {}
    const assets = exportData.assets || {}

    const usedTextures = getUsedTextures(exportData)

    const modelUrl = modelFileUrl || assets.customModel?.path
    const hasCustomTextures = usedTextures.length > 0
    const hasCustomModel = projectSettings.selectedGeometry === 'custom' && modelUrl

    const filename = `${title || 'project'}`

    if (hasCustomTextures || hasCustomModel) {
      try {
        // fetch 自定义贴图
        const resolvedTextures = []
        for (const tex of usedTextures) {
          const texUrl = tex.path
          if (!texUrl) continue

          const resolvedUrl = buildUrl(texUrl)
          try {
            const res = await fetch(resolvedUrl)
            const blob = await res.blob()
            resolvedTextures.push({
              id: tex.id,
              name: tex.name,
              file: blob
            })
          } catch (err) {
            console.error(`下载贴图 ${tex.name} 失败`, err)
            throw new Error(`贴图 ${tex.name} 下载失败`)
          }
        }

        // fetch 自定义模型
        let modelFile = null
        if (hasCustomModel) {
          try {
            const resolvedModelUrl = buildUrl(modelUrl)
            const res = await fetch(resolvedModelUrl)
            modelFile = await res.blob()
            modelFile.name = assets.customModel?.name || `${title || 'model'}.glb`
          } catch (err) {
            console.error(`下载自定义模型失败`, err)
            throw new Error('自定义模型下载失败')
          }
        }

        await exportAsZip(exportData, filename, resolvedTextures, modelFile)
        showToast('项目配置及资产已成功打包为 ZIP 导出', 'success')
      } catch (err) {
        showToast('打包 ZIP 失败: ' + err.message, 'error')
      }
    } else {
      exportAsJSON(exportData, filename)
      showToast('项目配置已成功导出为 JSON 下载', 'success')
    }
  }

  return {
    handleImportFile,
    handleImportText,
    handleClipboardPaste,
    handleExportFile,
    exportGraphFromModelDetail
  }
}
