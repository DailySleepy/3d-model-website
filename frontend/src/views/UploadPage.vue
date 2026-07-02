<template>
  <div class="flex flex-col">
    <!-- 导航区 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-4xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">首页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">上传作品</span>
        </nav>
      </div>
    </section>

    <!-- 主内容区 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-4xl">
        <!-- 标题 -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">上传作品</h1>
          <p class="text-gray-600">请填写以下信息以上传您的 3D 作品</p>
        </div>

        <div class="space-y-6">
          <!-- 基础信息 -->
          <section class="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">基础信息</h2>
                <p class="text-sm text-gray-500">请输入您的作品名称和描述</p>
              </div>
              <span class="text-sm text-gray-400"><span class="text-red-600">*</span> 必填项</span>
            </div>

            <div class="space-y-6">
              <!-- 名称 -->
              <div>
                <label class="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>作品名称 <span class="text-red-600">*</span></span>
                  <span class="text-gray-400">{{ form.title.length }}/50</span>
                </label>
                <input
                  id="title-input"
                  v-model="form.title"
                  type="text"
                  maxlength="50"
                  placeholder="请输入作品名称"
                  class="input-modern w-full"
                  :class="{'border-flash-red': flashElements.title}"
                />
              </div>

              <!-- 描述 -->
              <div>
                <label class="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                  <span>作品描述 <span class="text-red-600">*</span></span>
                  <span class="text-gray-400">{{ form.description.length }}/1200</span>
                </label>
                <textarea
                  id="description-input"
                  v-model="form.description"
                  rows="6"
                  maxlength="1200"
                  placeholder="请输入作品描述，最多1200个字符"
                  class="input-modern w-full"
                  :class="{'border-flash-red': flashElements.description}"
                ></textarea>
              </div>



              <!-- 作品标签 -->
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-gray-700">作品标签 <span class="text-red-600">*</span></label>
                  <span class="text-xs text-gray-400">最多 {{ maxTags }} 个标签，已添加 {{ form.tags.length }} 个</span>
                </div>
                <div class="mt-2">
                  <input
                    id="tags-input"
                    v-model="tagInput"
                    @keydown.enter.prevent="handleTagEnter"
                    placeholder="请输入标签，按Enter添加"
                    class="input-modern w-full"
                    :class="{'border-flash-red': flashElements.tags}"
                  />
                </div>
                <div v-if="form.tags.length" class="mt-3 flex flex-wrap gap-2">
                  <span
                    v-for="(tag, index) in form.tags"
                    :key="`${tag}-${index}`"
                    class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                  >
                    {{ tag }}
                    <button type="button" class="text-xs font-bold cursor-pointer" @click="removeTag(index)">×</button>
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-sm text-gray-500 mb-2">推荐标签：</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="tag in recommendedTags"
                      :key="tag"
                      type="button"
                      class="rounded-full border px-3 py-1 text-sm transition-colors cursor-pointer"
                      :class="form.tags.includes(tag) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-500'"
                      @click="addTag(tag)"
                    >
                      {{ tag }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 资源文件上传 -->
          <section class="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">上传模型文件</h2>
                <p class="text-sm text-gray-500">上传自定义 3D 模型 (.glb 格式)。如果是纯材质或物理模拟，此项可选。</p>
              </div>
              <span class="text-xs text-gray-400">支持格式：.glb</span>
            </div>

            <div class="grid gap-6 md:grid-cols-3">
              <!-- 模型文件 -->
              <div id="model-file-section" class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col" :class="{'border-flash-red': flashElements.model}">
                <div>
                  <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold text-gray-900">模型文件</h3>
                    <span v-if="uploadAlerts.model.text" class="text-xs font-semibold" :class="uploadAlerts.model.type === 'success' ? 'text-green-600' : 'text-red-500'">
                      {{ uploadAlerts.model.text }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1 min-h-[48px]">请上传 3D 模型文件（.glb 格式），文件大小不能超过 200MB</p>
                </div>
                <div class="mt-4">
                  <label class="w-full inline-flex items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-blue-600 cursor-pointer hover:bg-blue-100 text-sm font-semibold transition-all"
                         :class="{ 'opacity-50 pointer-events-none cursor-not-allowed': uploading.model }">
                    <input type="file" class="hidden" accept=".glb" :disabled="uploading.model" @change="handleModelUpload" />
                    {{ uploading.model ? '上传中...' : '选择模型文件' }}
                  </label>
                </div>
                <div class="mt-3">
                  <p v-if="uploads.model.filename" class="text-sm text-gray-600 truncate font-medium">已上传: {{ uploads.model.filename }}</p>
                </div>
              </div>

              <!-- 封面图 -->
              <div id="thumbnail-section" class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col" :class="{'border-flash-red': flashElements.thumbnail}">
                <div>
                  <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold text-gray-900">封面图 <span class="text-red-600">*</span></h3>
                    <span v-if="uploadAlerts.thumbnail.text" class="text-xs font-semibold" :class="uploadAlerts.thumbnail.type === 'success' ? 'text-green-600' : 'text-red-500'">
                      {{ uploadAlerts.thumbnail.text }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1 min-h-[48px]">1280×800 像素，支持 jpg/png/webp 格式，文件大小小于 5MB</p>
                </div>
                <div class="mt-4 flex gap-2">
                  <label class="flex-1 inline-flex items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-blue-600 cursor-pointer hover:bg-blue-100 text-sm font-semibold transition-all"
                         :class="{ 'opacity-50 pointer-events-none cursor-not-allowed': uploading.thumbnail }">
                    <input type="file" class="hidden" accept="image/*" :disabled="uploading.thumbnail" @change="handleThumbnailUpload" />
                    {{ uploading.thumbnail ? '上传中...' : '选择封面图' }}
                  </label>
                  <button
                    @click="capturePreviewAsThumbnail"
                    type="button"
                    title="捕获预览截图为封面图"
                    class="px-4 py-3 border border-blue-500 hover:bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                    :disabled="!isPreviewReady"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </button>
                </div>
                <div class="mt-3">
                  <!-- 上传后的封面图显示与大图查看 -->
                  <div v-if="uploads.thumbnail.url" class="relative group w-full aspect-video rounded-xl overflow-hidden border border-gray-200 mt-2 bg-gray-50">
                    <img
                      :src="uploads.thumbnail.url"
                      class="w-full h-full object-cover cursor-zoom-in"
                      @click="openImageModal(uploads.thumbnail.url)"
                    />
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs pointer-events-none">
                      点击查看大图
                    </div>
                  </div>
                  <p v-if="uploads.thumbnail.filename" class="mt-2 text-sm text-gray-600 truncate">已上传: {{ uploads.thumbnail.filename }}</p>
                </div>
              </div>

              <!-- 预览图 -->
              <div class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                <div>
                  <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold text-gray-900">预览图</h3>
                    <span v-if="uploadAlerts.previews.text" class="text-xs font-semibold" :class="uploadAlerts.previews.type === 'success' ? 'text-green-600' : 'text-red-500'">
                      {{ uploadAlerts.previews.text }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1 min-h-[48px]">1920×1080 像素，支持 jpg/png/webp 格式，最多上传 6 张</p>
                </div>
                <div class="mt-4 flex gap-2">
                  <label class="flex-1 inline-flex items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-blue-600 cursor-pointer hover:bg-blue-100 text-sm font-semibold transition-all"
                         :class="{ 'opacity-50 pointer-events-none cursor-not-allowed': uploading.previews }">
                    <input type="file" class="hidden" accept="image/*" multiple :disabled="uploading.previews" @change="handlePreviewUpload" />
                    {{ uploading.previews ? '上传中...' : '选择预览图' }}
                  </label>
                  <button
                    @click="capturePreviewAsPreviewImg"
                    type="button"
                    title="捕获预览截图为预览图"
                    class="px-4 py-3 border border-blue-500 hover:bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                    :disabled="!isPreviewReady || uploads.previews.length >= 6"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </button>
                </div>
                <div class="mt-3">
                  <!-- 上传后的预览图网格显示与大图查看 -->
                  <div v-if="uploads.previews.length" class="grid grid-cols-3 gap-2 mt-2">
                    <div
                      v-for="(item, index) in uploads.previews"
                      :key="item.url"
                      class="relative group aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                    >
                      <img
                        :src="item.url"
                        class="w-full h-full object-cover cursor-zoom-in"
                        @click="openImageModal(item.url)"
                      />
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] pointer-events-none">
                        查看
                      </div>
                      <!-- 删除按钮 -->
                      <button
                        type="button"
                        class="absolute top-1 right-1 z-10 w-4 h-4 flex items-center justify-center bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                        @click.stop="removePreview(index)"
                        title="删除此预览图"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-2.5 h-2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p v-if="uploads.previews.length" class="mt-2 text-sm text-gray-600">
                    已上传 {{ uploads.previews.length }} 张预览图
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- 作品预览区 -->
          <section id="preview-section" class="bg-white p-6 rounded-lg shadow-md space-y-4 border border-transparent" :class="{'border-flash-red': flashElements.preview}">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900">作品预览</h2>
              <span
                class="px-2 py-0.5 rounded-full text-xs font-semibold"
                :class="hasShaderGraph ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
              >
                {{ hasShaderGraph ? 'Shader Graph' : '常规 3D 模型' }}
              </span>
            </div>

            <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <ModelViewer
                v-if="isPreviewReady"
                ref="previewViewerRef"
                :model-url="uploads.model.tempBlobUrl || uploads.model.url"
                :shader-graph-json="shaderGraphStore.publishData?.shaderGraphJson ? JSON.stringify(shaderGraphStore.publishData.shaderGraphJson) : ''"
                class="w-full h-full"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" class="w-10 h-10 mb-2 text-gray-400">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <p class="text-sm font-medium">等待资产加载...</p>
                <p class="text-xs text-gray-400 mt-1">上传模型或在 Shader Graph 创作后来此预览最终渲染</p>
              </div>
            </div>

            <div class="pt-2 flex justify-start">
              <button
                @click="goToShaderGraph"
                type="button"
                :disabled="uploading.model || uploading.submit"
                class="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122l9.37-9.37M9.53 16.122l-3.086 1.028A1.972 1.972 0 014.04 14.75l1.028-3.086 9.37-9.37M9.53 16.122L5.47 20m10.53-15L20 9" />
                </svg>
                去 ShaderGraph 编辑
              </button>
            </div>
          </section>

          <!-- 注意事项与提交 -->
          <section class="rounded-lg bg-gray-50 p-6 md:flex md:items-center md:justify-between gap-6 border border-gray-100">
            <div class="space-y-2">
              <h3 class="text-lg font-semibold text-gray-900">上传注意事项</h3>
              <p class="text-sm text-gray-500">请仔细阅读以下注意事项，以确保上传顺利进行</p>
              <ul class="text-sm text-gray-500 list-disc list-inside space-y-1">
                <li>请确保所有上传的文件符合格式和大小要求</li>
                <li>上传过程中请勿关闭或刷新页面</li>
                <li>确认上传前请仔细检查信息是否正确</li>
              </ul>
            </div>
            <div class="flex flex-col md:flex-row items-center gap-4 md:justify-end shrink-0 w-full md:w-auto">
              <!-- 系统自动识别类别展示 -->
              <div v-if="form.category" class="w-full md:w-auto flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-4 py-2.5 rounded-2xl shadow-sm">
                <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <span>分类：</span>
                <strong class="text-blue-600 font-semibold">{{ form.category }}</strong>
              </div>

              <button
                type="button"
                class="w-full md:w-auto rounded-2xl border border-gray-300 px-6 py-3 text-gray-700 hover:bg-white cursor-pointer"
                @click="handleReset"
                :disabled="uploading.submit || uploading.model"
              >
                重置
              </button>
              <button
                type="button"
                class="w-full md:w-auto rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 cursor-pointer"
                :disabled="uploading.submit || uploading.model"
                @click="handleSubmit"
              >
                {{ uploading.submit ? '提交中...' : (uploading.model ? '模型自动上传中...' : '提交') }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>

     <!-- 大图查看器 Modal -->
     <ImageModal
       :show="imageModal.show"
       :image-url="imageModal.url"
       @close="closeImageModal"
     />

    <!-- 全局 Toast 提示组件 -->
    <ToastMessage ref="toastRef" />
  </div>
</template>

<script setup>
import ModelViewer from '@/components/ModelViewer.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import ImageModal from '@/components/ImageModal.vue'
import { modelsApi, uploadApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useShaderGraphStore } from '@/views/ShaderGraph/stores/shaderGraph.js'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { confirmDialog } from '@/components/ConfirmDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const shaderGraphStore = useShaderGraphStore()

const toastRef = ref(null)

const hasUnsavedChanges = computed(() => {
  return Boolean(
    form.title.trim() ||
    form.description.trim() ||
    form.category ||
    form.tags.length > 0 ||
    uploads.model.tempBlobUrl ||
    uploads.model.url ||
    uploads.thumbnail.url ||
    uploads.previews.length > 0 ||
    shaderGraphStore.publishData
  )
})

const handleBeforeUnload = (e) => {
  if (hasUnsavedChanges.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}
const previewViewerRef = ref(null)

const imageModal = reactive({
  show: false,
  url: ''
})

const openImageModal = (url) => {
  imageModal.url = url
  imageModal.show = true
}

const closeImageModal = () => {
  imageModal.show = false
  imageModal.url = ''
}

const tagInput = ref('')
const recommendedTags = ['MMD', 'Blender', 'UE', '写实', '二次元', 'NPR', 'PBR', 'Rigged', 'Animated', '高模', '低模']
const maxTags = 20

const form = reactive({
  title: '',
  description: '',
  category: '', // '模型', '节点图', '模型+节点图'
  tags: []
})

const uploads = reactive({
  model: { tempBlobUrl: '', url: '', filename: '' },
  thumbnail: { url: '', filename: '' },
  previews: []
})

const uploadAlerts = reactive({
  model: { type: '', text: '' },
  thumbnail: { type: '', text: '' },
  previews: { type: '', text: '' }
})

const uploading = reactive({
  model: false,
  thumbnail: false,
  previews: false,
  submit: false
})

// 闪烁高亮组件状态
const flashElements = reactive({
  title: false,
  description: false,
  category: false,
  tags: false,
  thumbnail: false,
  model: false,
  preview: false
})

const triggerFlash = (key) => {
  flashElements[key] = false
  setTimeout(() => {
    flashElements[key] = true
  }, 10)
  setTimeout(() => {
    flashElements[key] = false
  }, 1500)
}

const previewUrls = computed(() => uploads.previews.map((item) => item.url))

const hasShaderGraph = computed(() => Boolean(shaderGraphStore.publishData))
const isPreviewReady = computed(() => Boolean(uploads.model.url || hasShaderGraph.value))

const updateCategory = () => {
  const hasModel = Boolean(uploads.model.url)
  const hasGraph = Boolean(shaderGraphStore.publishData)

  if (hasModel && hasGraph) {
    form.category = '模型+节点图'
  } else if (hasModel) {
    form.category = '模型'
  } else if (hasGraph) {
    form.category = '节点图'
  }
}

const dataURItoBlob = (dataURI) => {
  const byteString = atob(dataURI.split(',')[1])
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}

// 捕获预览窗口的截图并上传为封面图
const capturePreviewAsThumbnail = async () => {
  if (!previewViewerRef.value) return
  const dataUrl = previewViewerRef.value.captureScreenshot()
  if (!dataUrl) {
    toastRef.value?.show('获取截图失败，预览窗口尚未加载完成。', 'error')
    return
  }

  uploading.thumbnail = true
  resetAlert('thumbnail')
  try {
    const blob = dataURItoBlob(dataUrl)
    const file = new File([blob], 'preview_capture.png', { type: 'image/png' })

    const { data } = await uploadApi.uploadThumbnail(file)
    uploads.thumbnail = { url: data, path: data, filename: file.name }
    setAlert('thumbnail', 'success', '已上传')
    toastRef.value?.show('截图成功捕获并上传为封面！', 'success')
  } catch (error) {
    setAlert('thumbnail', 'error', '上传失败')
    toastRef.value?.show('截图上传失败：' + (error.message || ''), 'error')
  } finally {
    uploading.thumbnail = false
  }
}

// 捕获预览窗口的截图并上传追加为预览图之一
const capturePreviewAsPreviewImg = async () => {
  if (uploads.previews.length >= 6) {
    toastRef.value?.show('最多只能上传 6 张预览图', 'warning')
    return
  }
  if (!previewViewerRef.value) return
  const dataUrl = previewViewerRef.value.captureScreenshot()
  if (!dataUrl) {
    toastRef.value?.show('获取截图失败，预览窗口尚未加载完成。', 'error')
    return
  }

  uploading.previews = true
  resetAlert('previews')
  try {
    const blob = dataURItoBlob(dataUrl)
    const file = new File([blob], `preview_capture_${uploads.previews.length + 1}.png`, { type: 'image/png' })

    const { data } = await uploadApi.uploadPreviews([file])
    const urls = Array.isArray(data) ? data : data?.urls || []

    if (urls.length > 0) {
      uploads.previews.push({
        url: urls[0],
        filename: file.name
      })
      setAlert('previews', 'success', '已上传')
      toastRef.value?.show('截图已成功追加到预览图列表！', 'success')
    }
  } catch (error) {
    setAlert('previews', 'error', '上传失败')
    toastRef.value?.show('预览图截图上传失败：' + (error.message || ''), 'error')
  } finally {
    uploading.previews = false
  }
}

const goToShaderGraph = () => {
  router.push('/shadergraph')
}

const setAlert = (key, type, text) => {
  uploadAlerts[key].type = type
  uploadAlerts[key].text = text
}

const resetAlert = (key) => {
  setAlert(key, '', '')
}

const addTag = (value) => {
  const tag = (value || '').trim()
  if (!tag) return
  if (form.tags.includes(tag)) {
    toastRef.value?.show('该标签已存在！', 'warning')
    tagInput.value = ''
    return
  }
  if (form.tags.length >= maxTags) {
    toastRef.value?.show(`最多只能添加 ${maxTags} 个标签！`, 'warning')
    tagInput.value = ''
    return
  }
  form.tags.push(tag)
  tagInput.value = ''
}

const removeTag = (index) => {
  form.tags.splice(index, 1)
}

const handleTagEnter = () => {
  addTag(tagInput.value)
}

const resetForm = () => {
  form.title = ''
  form.description = ''
  form.category = ''
  form.tags = []

  if (uploads.model.tempBlobUrl && uploads.model.tempBlobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(uploads.model.tempBlobUrl)
  }
  uploads.model = { tempBlobUrl: '', url: '', filename: '' }
  uploads.thumbnail = { url: '', filename: '' }
  uploads.previews = []

  Object.keys(uploadAlerts).forEach((key) => resetAlert(key))
}

const handleReset = () => {
  resetForm()
  shaderGraphStore.publishData = null
  shaderGraphStore.uploadPageState = null
  shaderGraphStore.clearGraphState()
  toastRef.value?.show('已成功重置所有表单和暂存数据', 'info')
}

// 提取通用的核心模型上传与本地即时预览逻辑
const uploadAndPreviewModelFile = async (file, isAutoUpload = false) => {
  if (!file) return
  if (uploading.model) return
  uploading.model = true
  resetAlert('model')

  // 生成并设定本地临时预览 Blob URL 从而立刻加载且不闪烁
  const tempBlobUrl = URL.createObjectURL(file)
  uploads.model.tempBlobUrl = tempBlobUrl
  uploads.model.url = ''
  uploads.model.filename = file.name
  updateCategory()

  try {
    const { data } = await uploadApi.uploadModel(file)
    // 仅更新 url，以保持预览中的本地 tempBlobUrl 稳定不闪烁
    uploads.model.url = data
    setAlert('model', 'success', '已上传')
    toastRef.value?.show(
      isAutoUpload ? '关联的 3D 模型已成功自动上传' : '模型文件上传成功',
      'success'
    )
  } catch (error) {
    URL.revokeObjectURL(tempBlobUrl)
    uploads.model.tempBlobUrl = ''
    uploads.model.url = ''
    setAlert('model', 'error', '上传失败')
    toastRef.value?.show(
      (isAutoUpload ? '模型自动上传失败：' : '模型上传失败：') + (error.message || '网络错误'),
      'error'
    )
  } finally {
    uploading.model = false
    updateCategory()
  }
}

// 检查是否从 ShaderGraph 过来附带了模型 (原始模型文件/已有模型 url)
const handleGraphCustomModel = async (pData) => {
  if (pData.customModelFile) { // 如果在 ShaderGraph 添加了新模型, 则触发自动上传
    await uploadAndPreviewModelFile(pData.customModelFile, true)
  }
  else if (pData.customModelUrl) {
    const modelPath = pData.customModelUrl
    // 如果带回的是活跃的 blob: 临时预览地址
    if (modelPath.startsWith('blob:')) {
      // 仅更新 tempBlobUrl 用于即时预览渲染，保留已恢复的 url 以及原先好记的文件名
      uploads.model.tempBlobUrl = modelPath
      return
    }
    const filename = modelPath.substring(modelPath.lastIndexOf('/') + 1) || 'model.glb'
    uploads.model = { tempBlobUrl: '', url: modelPath, filename }
  }
  else {
    if (uploads.model.tempBlobUrl && uploads.model.tempBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploads.model.tempBlobUrl)
    }
    uploads.model = { tempBlobUrl: '', url: '', filename: '' }
    resetAlert('model')
  }
}

// 在上传页手动上传模型
const handleModelUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await uploadAndPreviewModelFile(file, false)
}

const handleThumbnailUpload = async (event) => {
  if (uploading.thumbnail) return
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.thumbnail = true
  resetAlert('thumbnail')
  try {
    const { data } = await uploadApi.uploadThumbnail(file)
    uploads.thumbnail = { url: data, filename: file.name }
    setAlert('thumbnail', 'success', '已上传')
    toastRef.value?.show('封面上传成功', 'success')
  } catch (error) {
    setAlert('thumbnail', 'error', '上传失败')
    toastRef.value?.show('封面上传失败：' + (error.message || ''), 'error')
  } finally {
    uploading.thumbnail = false
  }
}

const handlePreviewUpload = async (event) => {
  if (uploading.previews) return
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return
  uploading.previews = true
  resetAlert('previews')
  try {
    const { data } = await uploadApi.uploadPreviews(files)
    const urls = Array.isArray(data) ? data : data?.urls || []
    uploads.previews = urls.map((url, index) => ({
      url,
      filename: files[index]?.name || `预览图 ${index + 1}`
    }))
    setAlert('previews', 'success', '已上传')
    toastRef.value?.show('预览图上传成功', 'success')
  } catch (error) {
    setAlert('previews', 'error', '上传失败')
    toastRef.value?.show('预览图上传失败：' + (error.message || ''), 'error')
  } finally {
    uploading.previews = false
  }
}

const removePreview = (index) => {
  uploads.previews.splice(index, 1)
  if (uploads.previews.length === 0) {
    resetAlert('previews')
  }
}

const scrollToElement = (id) => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const handleSubmit = async () => {
  if (uploading.model) {
    toastRef.value?.show('关联的模型正在上传中，请稍候...', 'warning')
    return
  }
  const rules = [
    {
      test: () => !form.title.trim(),
      msg: '作品名称不能为空，请输入作品名称',
      el: 'title-input',
      flash: 'title'
    },
    {
      test: () => !form.description.trim(),
      msg: '作品描述不能为空，请输入作品描述',
      el: 'description-input',
      flash: 'description'
    },
    {
      test: () => !form.tags || form.tags.length === 0,
      msg: '请至少添加一个作品标签',
      el: 'tags-input',
      flash: 'tags'
    },
    {
      test: () => !form.category,
      msg: '作品必须包含 3D 模型文件或 ShaderGraph 节点图，请上传模型或前往编辑画布',
      el: 'model-file-section',
      flash: ['model', 'preview']
    },
    {
      test: () => !uploads.thumbnail.url,
      msg: '请选择并上传作品的封面图',
      el: 'thumbnail-section',
      flash: 'thumbnail'
    }
  ]

  for (const rule of rules) {
    if (rule.test()) {
      toastRef.value?.show(rule.msg, 'error')
      scrollToElement(rule.el)
      if (Array.isArray(rule.flash)) {
        rule.flash.forEach(triggerFlash)
      } else {
        triggerFlash(rule.flash)
      }
      return
    }
  }

  uploading.submit = true
  try {
    let finalShaderGraphJson = ''

    if (shaderGraphStore.publishData?.shaderGraphJson) {
      const pData = shaderGraphStore.publishData
      const originalJson = JSON.parse(JSON.stringify(pData.shaderGraphJson))
      const customTexturesMeta = []

      if (pData.customTextures && pData.customTextures.length > 0) {
        for (const tex of pData.customTextures) {
          if (tex.file) {
            try {
              const { data: serverUrl } = await uploadApi.uploadThumbnail(tex.file)
              customTexturesMeta.push({
                id: tex.id,
                name: tex.name,
                path: serverUrl
              })
            } catch (err) {
              console.error(`贴图 ${tex.name} 上传失败`, err)
              throw new Error(`关联贴图 ${tex.name} 自动上传失败，请重试`)
            }
          } else if (tex.url) {
            customTexturesMeta.push({
              id: tex.id,
              name: tex.name,
              path: tex.url
            })
          }
        }
      }

      const assets = originalJson.assets || {}
      if (customTexturesMeta.length > 0) {
        assets.customTextures = customTexturesMeta
      }
      const finalModelPath = uploads.model.url
      if (finalModelPath) {
        originalJson.projectSettings.selectedGeometry = 'custom'
        assets.customModel = {
          name: uploads.model.filename || 'model.glb',
          path: finalModelPath
        }
      }
      if (Object.keys(assets).length > 0) {
        originalJson.assets = assets
      }

      finalShaderGraphJson = JSON.stringify(originalJson)
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      tags: [...form.tags],
      fileUrl: uploads.model.url || '',
      thumbnailUrl: uploads.thumbnail.url,
      previewUrls: previewUrls.value,
      shaderGraphJson: finalShaderGraphJson || null,
      authorId: authStore.userId,
      format: 'GLB (.glb)'
    }

    await modelsApi.publish(payload)
    toastRef.value?.show('发布成功，已同步到个人主页！', 'success')
    resetForm()

    shaderGraphStore.publishData = null
    shaderGraphStore.uploadPageState = null
  } catch (error) {
    toastRef.value?.show(error.message || '提交失败，请稍后重试', 'error')
  } finally {
    uploading.submit = false
  }
}

onBeforeRouteLeave(async (to, from) => {
  if (to.path.startsWith('/shadergraph')) {
    // 暂存表单状态，防止跳转回来后数据丢失
    shaderGraphStore.uploadPageState = {
      form: { ...form },
      uploads: { ...uploads }
    }

    // 如果已有上传的自定义模型，直接回填进 Store 以便 Graph 画布载入该模型渲染 (优先使用 tempBlobUrl 保证本地瞬时无网络开销载入)
    if (uploads.model.tempBlobUrl || uploads.model.url) {
      shaderGraphStore.customModelUrl = uploads.model.tempBlobUrl || uploads.model.url
      shaderGraphStore.customModelFile = null // customModelFile 已经上传, 可以置空, 防止回到上传页时检测到存在文件再次触发上传
      shaderGraphStore.selectedGeometry = 'custom'
    }
  }
  else {
    if (hasUnsavedChanges.value) {
      const confirmed = await confirmDialog({
        title: '放弃未保存的修改？',
        message: '您有未保存的表单修改，离开此页面将<span class="text-red-500 font-semibold" style="color: #ef4444;">丢失</span>这些修改。',
        confirmText: '确定离开',
        cancelText: '取消'
      })
      if (!confirmed) {
        return false
      }
    }

    if (uploads.model.tempBlobUrl && uploads.model.tempBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploads.model.tempBlobUrl)
    }
    // ModelViewer 中 watch 了 modelUrl 和 publishData.shaderGraphJson, 需要同时置空以免错误触发引擎更新
    uploads.model.tempBlobUrl = ''
    uploads.model.url = ''

    shaderGraphStore.uploadPageState = null
    shaderGraphStore.publishData = null
    shaderGraphStore.clearGraphState()
  }
})

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }

  // 尝试从暂存状态恢复数据（跳转 ShaderGraph 编辑后返回）
  if (shaderGraphStore.uploadPageState) {
    const saved = JSON.parse(JSON.stringify(shaderGraphStore.uploadPageState))
    Object.assign(form, saved.form)
    Object.assign(uploads, saved.uploads)
  }

  if (shaderGraphStore.publishData) {
    handleGraphCustomModel(shaderGraphStore.publishData)
  }

  updateCategory()
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
@keyframes border-flash {
  0%, 100% {
    border-color: #e5e7eb;
    box-shadow: none;
  }
  50% {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35);
  }
}

.border-flash-red {
  animation: border-flash 1.5s ease-in-out 1;
  transition: border-color 0.2s, box-shadow 0.2s;
}
</style>
