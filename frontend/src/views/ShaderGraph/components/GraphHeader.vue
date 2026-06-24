<template>
  <header class="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 z-20 shrink-0">
    <div class="flex items-center gap-3">
      <!-- 返回主页 -->
      <router-link to="/"
        class="group flex items-center justify-center w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-150 cursor-pointer"
        title="返回主页">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"
          class="w-5 h-5 transition-transform duration-150 group-hover:-translate-x-0.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </router-link>

      <!-- 标签页切换 -->
      <div class="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800 shrink-0">
        <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0"
          :class="store.activeTab === 'material' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
          @click="store.activeTab = 'material'">
          材质节点 (Material Graph)
        </button>
        <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0"
          :class="store.activeTab === 'simulation' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
          @click="store.activeTab = 'simulation'">
          模拟节点 (Simulation Graph)
        </button>
      </div>
    </div>

    <!-- 功能区 -->
    <div class="flex items-center gap-4 shrink-0">
      <!-- 上传 GLB -->
      <button v-if="store.selectedGeometry === 'custom'" @click="triggerModelInput"
        class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-all whitespace-nowrap shrink-0">
        上传 GLB
      </button>
      <input type="file" ref="modelInput" style="display: none;" accept=".glb,.gltf" @change="handleModelFileChange">

      <!-- 几何体选择 -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-zinc-400 whitespace-nowrap">几何形状:</span>
        <select v-model="store.selectedGeometry" @change="store.onGeometryChange"
          class="px-2 py-1 bg-zinc-950 border border-zinc-800 text-white rounded text-xs focus:outline-none focus:border-indigo-500 shrink-0">
          <option value="sphere">球体</option>
          <option value="box">方块</option>
          <option value="cylinder">圆柱</option>
          <option value="torus">圆环</option>
          <option value="plane">平面</option>
          <option value="custom">自定义 GLB...</option>
        </select>
      </div>

      <!-- 粒子数量 -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-zinc-400 whitespace-nowrap">粒子实例化数量:</span>
        <input type="number" v-model.number="store.particleCount" @change="store.onParticleCountChange" min="1" max="10000"
          class="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 text-white rounded text-xs text-center focus:outline-none focus:border-indigo-500 shrink-0" />
      </div>

      <!-- 重置粒子 -->
      <button @click="store.onParticleReset"
        class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-all whitespace-nowrap shrink-0">
        重置粒子
      </button>

      <!-- 重置相机 -->
      <button @click="store.onCameraReset"
        class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-all whitespace-nowrap shrink-0">
        重置相机
      </button>

      <!-- 导入文件 -->
      <SplitDropdown
        v-model="importMode"
        :options="importOptions"
        labelPrefix="导入"
        dropdownWidth="w-44"
        @click-main="triggerImportInput"
        class="h-6 shrink-0"
      >
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </template>
      </SplitDropdown>
      <input type="file" ref="importInput" style="display: none;" accept=".json,.zip" @change="handleImportFileChange">

      <!-- 导出文件 -->
      <SplitDropdown
        v-model="exportMode"
        :options="exportOptions"
        labelPrefix="导出"
        dropdownWidth="w-44"
        @click-main="handleExportWithMode(exportMode)"
        class="h-6 shrink-0"
      >
        <template #icon>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </template>
      </SplitDropdown>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useShaderGraphStore } from '../stores/shaderGraph'
import { useGraphIO } from '../composables/useGraphIO'
import SplitDropdown from '@/components/SplitDropdown.vue'

const store = useShaderGraphStore()

const { handleImportFile, handleExportFile } = useGraphIO()

const modelInput = ref(null)

const triggerModelInput = () => {
  if (modelInput.value) modelInput.value.click()
}

const handleModelFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  store.onCustomModelUpload(file)
  event.target.value = ''
}

const importMode = ref('current')
const importOptions = [
  { value: 'current', label: '当前', desc: '导入到当前图 (JSON / ZIP)' },
  { value: 'all',     label: '全部', desc: '导入到全部图 (JSON / ZIP)' }
]

const importInput = ref(null)

const triggerImportInput = () => {
  if (importInput.value) importInput.value.click()
}

const handleImportFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  handleImportFile(file, importMode.value)
  event.target.value = ''
}

const exportMode = ref('current')
const exportOptions = [
  { value: 'current',   label: '当前', desc: '导出当前图为 JSON / ZIP' },
  { value: 'all',       label: '全部', desc: '导出全部图为 JSON / ZIP' },
  { value: 'selection', label: '选中', desc: '导出选中节点为 JSON / ZIP' }
]

const handleExportWithMode = (mode) => {
  if (['current', 'all', 'selection'].includes(mode)) {
    handleExportFile(mode)
  }
}
</script>

<style scoped>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
