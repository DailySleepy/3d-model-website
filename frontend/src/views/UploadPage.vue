<template>
  <div class="flex flex-col">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">首页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">上传模型</span>
        </nav>
      </div>
    </section>

    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl space-y-6">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">上传模型</h1>
          <p class="text-gray-600">请填写以下信息以上传您的3D模型</p>
        </div>

          <section class="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">模型名称</h2>
                <p class="text-sm text-gray-500">请输入您的模型名称，最多50个字符</p>
              </div>
              <span class="text-sm text-gray-400"><span class="text-red-600">*</span> 必填项</span>
            </div>
            <div class="space-y-6">
              <div>
                <label class="flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>模型名称 <span class="text-red-600">*</span></span>
                  <span class="text-gray-400">{{ form.title.length }}/50</span>
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  maxlength="50"
                  placeholder="请输入模型名称"
                  class="input-modern"
                />
              </div>
              <div>
                <label class="flex items-center justify-between text-sm font-medium text-gray-700">
                  <span>模型描述 <span class="text-red-600">*</span></span>
                  <span class="text-gray-400">{{ form.description.length }}/1200</span>
                </label>
                <textarea v-model="form.description" rows="6" maxlength="1200" placeholder="请输入模型描述，最多1200个字符"
                  class="input-modern"></textarea>
              </div>
              <div class="grid gap-6 md:grid-cols-2">
                <div>
                  <label class="text-sm font-medium text-gray-700">模型格式 <span class="text-red-600">*</span></label>
                  <select v-model="form.format"
                    class="input-modern">
                    <option value="" disabled>请选择模型格式</option>
                    <option v-for="item in formatOptions" :key="item" :value="item">
                      {{ item }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-700">模型分类 <span class="text-red-600">*</span></label>
                  <select v-model="form.category"
                    class="input-modern">
                    <option value="" disabled>请选择模型分类</option>
                    <option v-for="item in categoryOptions" :key="item" :value="item">
                      {{ item }}
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-gray-700">模型标签 <span class="text-red-600">*</span></label>
                  <span class="text-xs text-gray-400">最多 20 个标签，剩余 {{ remainingTags }} 个</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <input v-model="tagInput" @keydown.enter.prevent="handleTagEnter" placeholder="请输入标签，按Enter添加"
                    class="input-modern" />
                </div>
                <div v-if="form.tags.length" class="mt-3 flex flex-wrap gap-2">
                  <span v-for="(tag, index) in form.tags" :key="`${tag}-${index}`"
                    class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                    {{ tag }}
                    <button type="button" class="text-xs" @click="removeTag(index)">×</button>
                  </span>
                </div>
                <div class="mt-4">
                  <p class="text-sm text-gray-500 mb-2">推荐标签：</p>
                  <div class="flex flex-wrap gap-2">
                    <button v-for="tag in recommendedTags" :key="tag" type="button"
                      class="rounded-full border px-3 py-1 text-sm" :class="form.tags.includes(tag) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-500'"
                        @click="addTag(tag)">
                      {{ tag }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h2 class="text-xl font-semibold text-gray-900">上传模型</h2>
                <p class="text-sm text-gray-500">请上传您的3D模型文件（.glb格式）</p>
              </div>
              <span class="text-xs text-gray-400">支持格式：.glb</span>
            </div>
            <!--模型文件-->
            <div class="grid gap-6 md:grid-cols-3">
              <div class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                <h3 class="text-base font-semibold text-gray-900">模型文件 <span class="text-red-600">*</span></h3>
                <p class="text-xs text-gray-500 mt-1">请上传3D模型文件（.glb格式），文件大小不能超过200MB</p>
                <label
                  class="mt-4 inline-flex items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3 text-blue-600 cursor-pointer hover:bg-blue-100">
                  <input type="file" class="hidden" accept=".glb" @change="handleModelUpload" />
                  {{ uploading.model ? '上传中...' : '选择模型文件' }}
                </label>
                <p v-if="uploads.model.filename" class="mt-3 text-sm text-gray-600">已上传{{ uploads.model.filename }}</p>
                <p v-if="uploadAlerts.model.text" class="mt-2 text-sm"
                  :class="uploadAlerts.model.type === 'success' ? 'text-green-600' : 'text-red-500'">
                  {{ uploadAlerts.model.text }}
                </p>
              </div>

              <div class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                <h3 class="text-base font-semibold text-gray-900">缩略图 <span class="text-red-600">*</span></h3>
                <p class="text-xs text-gray-500 mt-1">1280×800像素，支持 jpg/png/webp 格式，文件大小小于 5MB</p>
                <label
                  class="mt-4 inline-flex items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-amber-600 cursor-pointer hover:bg-amber-100">
                  <input type="file" class="hidden" accept="image/*" @change="handleThumbnailUpload" />
                  {{ uploading.thumbnail ? '上传中...' : '选择缩略图' }}
                </label>
                <p v-if="uploads.thumbnail.filename" class="mt-3 text-sm text-gray-600">已上传{{ uploads.thumbnail.filename }}</p>
                <p v-if="uploadAlerts.thumbnail.text" class="mt-2 text-sm"
                  :class="uploadAlerts.thumbnail.type === 'success' ? 'text-green-600' : 'text-red-500'">
                  {{ uploadAlerts.thumbnail.text }}
                </p>
              </div>

              <div class="rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
                <h3 class="text-base font-semibold text-gray-900">预览图 <span class="text-red-600">*</span></h3>
                <p class="text-xs text-gray-500 mt-1">1920×1080像素，支持 jpg/png/webp 格式，文件大小小于 5MB，最多上传 6 张</p>
                <label
                  class="mt-4 inline-flex items-center justify-center rounded-2xl border border-dashed border-purple-300 bg-purple-50/60 px-4 py-3 text-purple-600 cursor-pointer hover:bg-purple-100">
                  <input type="file" class="hidden" accept="image/*" multiple @change="handlePreviewUpload" />
                  {{ uploading.previews ? '上传中...' : '选择预览图' }}
                </label>
                <p v-if="uploads.previews.length" class="mt-3 text-sm text-gray-600">
                  已上传 {{ uploads.previews.length }} 张预览图
                </p>
                <ul v-if="uploads.previews.length" class="mt-2 space-y-1 text-xs text-gray-500 max-h-24 overflow-auto">
                  <li v-for="item in uploads.previews" :key="item.url">{{ item.filename }}</li>
                </ul>
                <p v-if="uploadAlerts.previews.text" class="mt-2 text-sm"
                  :class="uploadAlerts.previews.type === 'success' ? 'text-green-600' : 'text-red-500'">
                  {{ uploadAlerts.previews.text }}
                </p>
              </div>
            </div>

            <!--注意事项-->
            <div
              class="rounded-3xl border border-gray-100 bg-gray-50 p-6 md:flex md:items-center md:justify-between gap-6">
              <div class="space-y-2">
                <h3 class="text-lg font-semibold text-gray-900">上传注意事项</h3>
                <p class="text-sm text-gray-500">
                  请仔细阅读以下注意事项，以确保上传顺利进行
                </p>
                <ul class="text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>请确保所有上传的文件符合格式和大小要求</li>
                  <li>上传过程中请勿关闭或刷新页面</li>
                  <li>上传完成后请仔细检查信息是否正确</li>
                </ul>
                <p v-if="submitFeedback.text" class="text-sm"
                  :class="submitFeedback.type === 'success' ? 'text-green-600' : 'text-red-500'">
                  {{ submitFeedback.text }}
                </p>
              </div>
              <div class="flex flex-col md:flex-row gap-3 md:justify-end">
                <button type="button"
                  class="w-full md:w-auto rounded-2xl border border-gray-300 px-6 py-3 text-gray-700 hover:bg-white"
                  @click="handleReset" :disabled="uploading.submit">
                  重置
                </button>
                <button type="button"
                  class="w-full md:w-auto rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold shadow hover:bg-blue-700 disabled:bg-gray-300 bg-blue-600"
                  :disabled="!canSubmit || uploading.submit" @click="handleSubmit">
                  {{ uploading.submit ? '提交中...' : '提交' }}
                </button>
              </div>
            </div>
          </section>
      </div>
    </section>
  </div>
</template>

<script setup>
import { modelsApi, uploadApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

const formatOptions = ['GLB (.glb)']
const categoryOptions = ['人物', '场景', '材质', '配件', '建筑', '植物', '机械', '其他']
const recommendedTags = ['MMD', 'Blender', 'UE', '写实', '二次元', 'NPR', 'PBR', 'Rigged', 'Animated', '高模', '低模']
const maxTags = 20

const form = reactive({
  title: '',
  description: '',
  format: '',
  category: '',
  tags: []
})

const tagInput = ref('')

const uploads = reactive({
  model: { url: '', path: '', filename: '' },
  thumbnail: { url: '', path: '', filename: '' },
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

const submitFeedback = reactive({ type: '', text: '' })

const remainingTags = computed(() => Math.max(0, maxTags - form.tags.length))
const previewUrls = computed(() => uploads.previews.map((item) => item.url))
const canSubmit = computed(() =>
  Boolean(
    form.title.trim() &&
    form.description.trim() &&
    form.format &&
    form.category &&
    form.tags.length &&
    uploads.model.url &&
    uploads.thumbnail.url
  )
)

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
  }
})

const setAlert = (key, type, text) => {
  uploadAlerts[key].type = type
  uploadAlerts[key].text = text
}

const addTag = (value) => {
  const tag = (value || '').trim()
  if (!tag || form.tags.includes(tag) || form.tags.length >= maxTags) {
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

const resetAlert = (key) => {
  setAlert(key, '', '')
}

const resetForm = () => {
  form.title = ''
  form.description = ''
  form.format = ''
  form.category = ''
  form.tags = []
  tagInput.value = ''
  uploads.model = { url: '', path: '', filename: '' }
  uploads.thumbnail = { url: '', path: '', filename: '' }
  uploads.previews = []
  Object.keys(uploadAlerts).forEach((key) => resetAlert(key))
}

const clearSubmitFeedback = () => {
  submitFeedback.type = ''
  submitFeedback.text = ''
}

const handleReset = () => {
  clearSubmitFeedback()
  resetForm()
}

const handleModelUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.model = true
  resetAlert('model')
  try {
    const { data } = await uploadApi.uploadModel(file)
    uploads.model = { url: data, path: data, filename: file.name }
    setAlert('model', 'success', '模型文件上传成功')
  } catch (error) {
    setAlert('model', 'error', error.message || '模型上传失败')
  } finally {
    uploading.model = false
  }
}

const handleThumbnailUpload = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.thumbnail = true
  resetAlert('thumbnail')
  try {
    const { data } = await uploadApi.uploadThumbnail(file)
    uploads.thumbnail = { url: data, path: data, filename: file.name }
    setAlert('thumbnail', 'success', '封面上传成功')
  } catch (error) {
    setAlert('thumbnail', 'error', error.message || '封面上传失败')
  } finally {
    uploading.thumbnail = false
  }
}

const handlePreviewUpload = async (event) => {
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
    setAlert('previews', 'success', '预览图上传成功')
  } catch (error) {
    setAlert('previews', 'error', error.message || '预览图上传失败')
  } finally {
    uploading.previews = false
  }
}

const handleSubmit = async () => {
  submitFeedback.type = ''
  submitFeedback.text = ''
  if (!canSubmit.value) {
    submitFeedback.type = 'error'
    submitFeedback.text = '请先完成必填项并上传必要文件'
    return
  }
  uploading.submit = true
  try {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      tags: [...form.tags],
      fileUrl: uploads.model.url,
      thumbnailUrl: uploads.thumbnail.url,
      previewUrls: previewUrls.value,
      authorId: authStore.userId
    }
    await modelsApi.publish(payload)
    submitFeedback.type = 'success'
    submitFeedback.text = '模型发布成功，已同步到个人主页！'
    resetForm()
  } catch (error) {
    submitFeedback.type = 'error'
    submitFeedback.text = error.message || '提交失败，请稍后重试'
  } finally {
    uploading.submit = false
  }
}
</script>
