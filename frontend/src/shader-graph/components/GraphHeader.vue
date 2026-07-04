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
        <button v-if="store.enableSimulation" class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0"
          :class="store.activeTab === 'simulation' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
          @click="store.activeTab = 'simulation'">
          模拟节点 (Simulation Graph)
        </button>
      </div>
    </div>

    <!-- 功能区 -->
    <div class="flex items-center gap-3 shrink-0 h-8">
      <!-- 场景配置 -->
      <Popover panelClass="w-64 p-4">
        <template #trigger>
          <button
            class="px-3 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm h-full"
            title="配置 3D 场景与几何体"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-zinc-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span>场景配置</span>
          </button>
        </template>
        <template #content>
          <div class="flex flex-col gap-4">
            <h4 class="text-[13px] font-semibold text-zinc-200 border-b border-zinc-700 pb-2">3D 场景配置</h4>

            <!-- 几何形状 -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">几何形状</span>
              <select
                v-model="store.selectedGeometry"
                @change="store.onGeometryChange"
                class="px-2 py-1 bg-zinc-900 border border-zinc-800 text-white rounded text-xs focus:outline-none focus:border-indigo-500 w-24"
              >
                <option value="sphere">球体</option>
                <option value="box">方块</option>
                <option value="cylinder">圆柱</option>
                <option value="torus">圆环</option>
                <option value="plane">平面</option>
                <option value="custom">自定义 GLB</option>
              </select>
            </div>

            <!-- 上传 GLB -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">自定义 GLB</span>
              <button
                @click="triggerModelInput"
                class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-all whitespace-nowrap"
              >
                {{ store.selectedGeometry === 'custom' && store.customModelFile ? '重新上传' : '上传 GLB' }}
              </button>
            </div>

            <div class="border-t border-zinc-700"></div>

            <!-- 粒子模拟开关 -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">粒子模拟</span>
              <input
                type="checkbox"
                :checked="store.enableSimulation"
                @change="e => store.toggleSimulationMode(e.target.checked)"
                class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
            </div>

            <!-- (if 开启粒子模拟) 粒子数量 -->
            <div v-if="store.enableSimulation" class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">实例化数量</span>
              <NumberDragInput
                v-model="store.particleCount"
                @update:modelValue="store.onParticleCountChange"
                :min="1"
                :max="10000"
                :step="1"
                class="w-20 h-5"
              />
            </div>

            <!-- (if 开启粒子模拟) 重置粒子 -->
            <div v-if="store.enableSimulation" class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">重置粒子状态</span>
              <button
                @click="store.onParticleReset"
                class="px-2.5 py-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded text-xs transition-all"
              >
                立即重置
              </button>
            </div>

            <div class="border-t border-zinc-700"></div>

            <!-- 显示 FPS 开关 -->
            <div class="flex items-center justify-between gap-4">
              <span class="text-zinc-400">显示 FPS</span>
              <input
                type="checkbox"
                v-model="store.showFPS"
                class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </template>
      </Popover>
      <input type="file" ref="modelInput" style="display: none;" accept=".glb,.gltf" @change="handleModelFileChange">

      <!-- 相机栏 -->
      <Popover panelClass="w-48 p-3">
        <template #trigger>
          <button
            class="px-3 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm h-full"
            title="相机配置与视角重置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-zinc-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316A2.192 2.192 0 0 0 14.68 3.6H9.32c-.598 0-1.15.309-1.479.808l-.813 1.297ZM9 13.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
            </svg>
            <span>相机配置</span>
          </button>
        </template>
        <template #content="{ close }">
          <button
            @click="triggerCameraReset(); close()"
            class="w-full px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded text-left transition-all"
          >
            重置相机视角
          </button>
        </template>
      </Popover>

      <!-- 导入 / 导出 -->
      <Popover panelClass="w-60 p-1.5">
        <template #trigger="{ open }">
          <button
            class="px-3 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm h-full"
            title="项目导入与导出"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 text-zinc-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>导入/导出</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5 text-zinc-500 transition-transform duration-150" :class="{ 'rotate-180': open }">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </template>
        <template #content="{ close }">
          <div class="flex flex-col">
            <template v-for="(item, idx) in fileActions" :key="item.value || 'divider-' + idx">
              <div v-if="item.divider" class="my-1 border-t border-zinc-700 mx-1"></div>
              <button
                v-else
                @click="handleFileAction(item.value); close()"
                class="w-full px-3 py-2 text-left rounded-lg text-zinc-300 transition-all flex items-center gap-2 group/item cursor-pointer"
                :class="item.value.startsWith('import_') ? 'hover:text-blue-400 hover:bg-blue-950/20' : 'hover:text-emerald-400 hover:bg-emerald-950/20'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150"
                  :class="item.value.startsWith('import_') ? 'bg-blue-500/70 group-hover/item:bg-blue-400' : 'bg-emerald-500/70 group-hover/item:bg-emerald-400'"
                ></span>
                <span class="font-medium text-[11px]" v-html="item.label"></span>
              </button>
            </template>
          </div>
        </template>
      </Popover>
      <input type="file" ref="importInput" style="display: none;" accept=".json,.zip" @change="handleImportFileChange">

      <!-- 发布按钮 -->
      <button @click="handlePublish"
        class="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm h-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        发布
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShaderGraphStore } from '../stores/shaderGraph'
import { useGraphIO } from '../composables/useGraphIO'
import Popover from '@/components/Popover.vue'
import NumberDragInput from './NumberDragInput.vue'

const store = useShaderGraphStore()
const router = useRouter()

const { handleImportFile, handleExportFile } = useGraphIO()

const triggerCameraReset = () => {
  store.onCameraReset()
}

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

const handleExportWithMode = (mode) => {
  if (['current', 'all', 'selection'].includes(mode)) {
    handleExportFile(mode)
  }
}

// 导入导出行为项配置
const fileActions = [
  { value: 'import_current', label: '导入到 <span class="font-semibold">当前</span> 图' },
  { value: 'import_all',     label: '导入完整项目 (<span class="font-semibold">全部图 + 全局配置</span>)' },
  { divider: true },
  { value: 'export_current',   label: '导出 <span class="font-semibold">当前画布</span> 节点' },
  { value: 'export_selection', label: '导出 <span class="font-semibold">选中</span> 节点' },
  { value: 'export_all',       label: '导出完整项目 (<span class="font-semibold">全部图 + 全局配置</span>)' }
]

const handleFileAction = (value) => {
  if (value.startsWith('import_')) {
    const mode = value.replace('import_', '')
    importMode.value = mode
    triggerImportInput()
  } else if (value.startsWith('export_')) {
    const mode = value.replace('export_', '')
    handleExportWithMode(mode)
  }
}

const handlePublish = () => {
  router.push('/upload')
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
