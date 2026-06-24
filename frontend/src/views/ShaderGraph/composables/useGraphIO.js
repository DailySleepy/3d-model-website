import { nextTick } from 'vue'
import { generateExportData, parseGraphJSON, remapAndRepositionGraph, getUsedTextureIds } from "../utils/graphIO"
export { generateExportData, parseGraphJSON, remapAndRepositionGraph, getUsedTextureIds } from "../utils/graphIO"
import { useShaderGraphStore } from "../stores/shaderGraph"
import { confirmDialog } from '@/components/ConfirmDialog.vue'
import JSZip from 'jszip'

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

    let parsedData
    try {
      parsedData = JSON.parse(text)
    } catch (e) {
      store.showToast('JSON 格式错误', 'error')
      return
    }

    const projectSettings = parsedData.projectSettings || {}

    // 并发加载贴图资源
    const texturesMeta = projectSettings.customTextures
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
    const modelMeta = projectSettings.customModel
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

    // 应用图和文本
    handleImportText(text, mode)
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

  const exportAsJSON = (exportData, filename) => {
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    a.click()

    URL.revokeObjectURL(url)
    store.showToast('项目配置已成功导出并下载', 'success')
  }

  const exportAsZip = async (exportData, filename, usedCustomTextures) => {
    const zip = new JSZip()
    const usedPaths = new Set()

    // 1. 打包自定义贴图
    const customTexturesMeta = usedCustomTextures.map(tex => {
      let fileName = tex.name
      let path = `assets/textures/${fileName}`
      let counter = 1
      while (usedPaths.has(path)) {
        const dotIdx = fileName.lastIndexOf('.')
        const base = dotIdx !== -1 ? fileName.substring(0, dotIdx) : fileName
        const ext = dotIdx !== -1 ? fileName.substring(dotIdx) : ''
        path = `assets/textures/${base}_${counter}${ext}`
        counter++
      }
      usedPaths.add(path)

      zip.file(path, tex.file)

      return {
        id: tex.id,
        name: tex.name,
        path: path
      }
    })

    // 2. 打包自定义模型
    let customModelMeta = null
    const hasCustomModel = store.selectedGeometry === 'custom' && store.customModelFile
    if (hasCustomModel) {
      const modelPath = 'assets/model/model.glb'
      zip.file(modelPath, store.customModelFile)
      customModelMeta = {
        name: store.customModelFile.name,
        path: modelPath
      }
    }

    // 3. 注入元数据
    if (customTexturesMeta.length > 0 || customModelMeta) {
      const projectSettings = exportData.projectSettings || {}
      if (customTexturesMeta.length > 0) {
        projectSettings.customTextures = customTexturesMeta
      }
      if (customModelMeta) {
        projectSettings.customModel = customModelMeta
      }
      exportData.projectSettings = projectSettings
    }

    // 4. 打包 json
    const jsonStr = JSON.stringify(exportData, null, 2)
    zip.file('shadergraph.json', jsonStr)

    // 5. 压缩下载
    try {
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.zip`
      a.click()
      URL.revokeObjectURL(url)
      store.showToast('项目配置及自定义资产已成功打包为 ZIP 导出', 'success')
    } catch (err) {
      console.error(err)
      store.showToast('生成 ZIP 失败', 'error')
    }
  }

  const handleExportFile = async (mode) => {
    let graphsToExport = {}
    let projectSettings = {}
    let filename = ''

    if (mode === 'current') {
      graphsToExport[store.activeTab] = {
        nodes: store.currentNodes,
        edges: store.currentEdges
      }
      projectSettings = {
        particleCount: store.particleCount,
        selectedGeometry: store.selectedGeometry
      }
      filename = `shadergraph-${store.activeTab}-${Date.now()}`
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
      projectSettings = {
        particleCount: store.particleCount,
        selectedGeometry: store.selectedGeometry
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
      const usedTextureIds = getUsedTextureIds(exportData)
      usedCustomTextures = store.customTextures.filter(tex => usedTextureIds.has(tex.id))
    }

    const hasCustomTextures = usedCustomTextures.length > 0
    const hasCustomModel = store.selectedGeometry === 'custom' && store.customModelFile

    if (hasCustomTextures || hasCustomModel) {
      await exportAsZip(exportData, filename, usedCustomTextures)
    } else {
      exportAsJSON(exportData, filename)
    }
  }

  return {
    handleImportFile,
    handleImportText,
    handleClipboardPaste,
    handleExportFile
  }
}
