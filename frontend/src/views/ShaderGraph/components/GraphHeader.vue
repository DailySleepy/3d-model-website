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
      <div class="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
        <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
          :class="activeTab === 'material' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
          @click="activeTab = 'material'">
          材质节点 (Material Graph)
        </button>
        <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
          :class="activeTab === 'simulation' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'"
          @click="activeTab = 'simulation'">
          模拟节点 (Simulation Graph)
        </button>
      </div>
    </div>

    <!-- 功能区 -->
    <div class="flex items-center gap-4">
      <!-- 上传 GLB -->
      <button v-if="selectedGeometry === 'custom'" @click="triggerModelInput"
        class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-all">
        上传 GLB
      </button>
      <input type="file" ref="modelInput" style="display: none;" accept=".glb,.gltf" @change="handleFileChange">

      <!-- 几何体选择 -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400">几何形状:</span>
        <select v-model="selectedGeometry" @change="emit('onGeometryChange')"
          class="px-2 py-1 bg-zinc-950 border border-zinc-800 text-white rounded text-xs focus:outline-none focus:border-indigo-500">
          <option value="sphere">球体</option>
          <option value="box">方块</option>
          <option value="cylinder">圆柱</option>
          <option value="torus">圆环</option>
          <option value="plane">平面</option>
          <option value="custom">自定义 GLB...</option>
        </select>
      </div>

      <!-- 粒子数量 -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-zinc-400">粒子实例化数量:</span>
        <input type="number" v-model.number="particleCount" @change="emit('onParticleCountChange')" min="1" max="10000"
          class="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 text-white rounded text-xs text-center focus:outline-none focus:border-indigo-500" />
      </div>

      <!-- 重置粒子 -->
      <button @click="emit('onParticleReset')"
        class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-all">
        重置粒子
      </button>

      <!-- 重置相机 -->
      <button @click="emit('onCameraReset')"
        class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-all">
        重置相机
      </button>

      <!-- 导出文件 -->
      <button
        class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition-all">
        导出文件 TODO
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = defineModel('activeTab', { type: String, default: 'material' })
const particleCount = defineModel('particleCount', { type: Number, default: 1 })
const selectedGeometry = defineModel('selectedGeometry', { type: String, default: 'sphere' })

const emit = defineEmits(['onParticleCountChange', 'onGeometryChange', 'onCustomModelUpload', 'onParticleReset', 'onCameraReset'])

const modelInput = ref(null)

const triggerModelInput = () => {
  if (modelInput.value) modelInput.value.click()
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  emit('onCustomModelUpload', file)
  event.target.value = ''
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
