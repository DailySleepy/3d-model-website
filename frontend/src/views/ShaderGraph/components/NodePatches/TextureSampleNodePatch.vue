<template>
  <div class="flex flex-col gap-1.5 px-2.5 py-1.5 text-[10px] text-zinc-300">
    <!-- 主体：左侧预览，右侧配置 -->
    <div class="flex gap-2">
      <!-- 左侧：缩略图预览 / 上传区域 -->
      <div
        @click="triggerUpload"
        class="group relative w-12 h-12 shrink-0 rounded border border-dashed border-zinc-700/80 hover:border-indigo-500/80 hover:bg-zinc-950/80 bg-zinc-950/40 overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-[0.95]"
      >
        <img
          v-if="currentTextureUrl"
          :src="currentTextureUrl"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div v-else class="flex flex-col items-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 animate-pulse">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 1.5V19.5a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5zM13.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
          <span class="text-[8px] mt-0.5 scale-90">上传</span>
        </div>
        <!-- 悬停更换贴图蒙层 -->
        <div v-if="currentTextureUrl" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150 backdrop-blur-[1px]">
          <span class="text-[8px] text-white font-medium scale-90">更换</span>
        </div>
      </div>
      <input
        type="file"
        ref="fileInput"
        style="display: none;"
        accept="image/*"
        @change="handleFileChange"
      />

      <!-- 右侧：选择已上传纹理 -->
      <div class="flex-1 flex flex-col justify-center gap-1 min-w-0">
        <span class="text-zinc-500 text-[9px] select-none font-medium">选择贴图:</span>
        <select
          :value="data.properties?.textureId || ''"
          @change="e => selectTexture(e.target.value)"
          class="w-full bg-zinc-950 border border-zinc-800/80 text-zinc-200 rounded px-1.5 py-0.5 text-[9px] focus:outline-none focus:border-indigo-500/80 cursor-pointer transition-colors truncate"
        >
          <option value="" disabled>-- 点击或选择 --</option>
          <option v-for="tex in store.customTextures" :key="tex.id" :value="tex.id">
            {{ tex.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- 底部：包裹和插值参数并排 -->
    <div class="grid grid-cols-2 gap-2 mt-0.5 border-t border-zinc-800/40 pt-1.5">
      <div class="flex flex-col gap-0.5">
        <span class="text-zinc-500 text-[9px] select-none font-medium">包裹方式 (Wrap)</span>
        <select
          :value="data.properties?.wrap || 'repeat'"
          @change="e => updateProperty('wrap', e.target.value)"
          class="w-full bg-zinc-950 border border-zinc-800/80 text-zinc-200 rounded px-1 py-0.5 text-[9px] focus:outline-none focus:border-indigo-500/80 cursor-pointer transition-colors"
        >
          <option value="repeat">Repeat</option>
          <option value="clamp">Clamp</option>
          <option value="mirror">Mirror</option>
        </select>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-zinc-500 text-[9px] select-none font-medium">插值过滤 (Filter)</span>
        <select
          :value="data.properties?.filter || 'linear'"
          @change="e => updateProperty('filter', e.target.value)"
          class="w-full bg-zinc-950 border border-zinc-800/80 text-zinc-200 rounded px-1 py-0.5 text-[9px] focus:outline-none focus:border-indigo-500/80 cursor-pointer transition-colors"
        >
          <option value="linear">Linear</option>
          <option value="nearest">Closest</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useShaderGraphStore } from '../../stores/shaderGraph.js'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  theme: { type: Object, required: true }
})

const store = useShaderGraphStore()
const fileInput = ref(null)

const currentTextureUrl = computed(() => {
  const texId = props.data.properties?.textureId
  if (!texId) return null
  const tex = store.customTextures.find(t => t.id === texId)
  return tex ? tex.url : null
})

const triggerUpload = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  try {
    const newTex = await store.addCustomTextureFromFile(file)
    selectTexture(newTex.id)
    store.showToast(`贴图 <b>${file.name}</b> 上传并加载成功`, 'success')
  } catch (err) {
    console.error(err)
    store.showToast('贴图加载失败', 'error')
  }

  e.target.value = ''
}

const selectTexture = (texId) => {
  updateProperty('textureId', texId)
}

const updateProperty = (key, val) => {
  store.updateNodeData(props.id, {
    properties: {
      ...props.data.properties,
      [key]: val
    }
  })
}
</script>
