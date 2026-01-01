<template>
  <div class="flex flex-col">
    <ToastMessage ref="toastRef" />
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="cursor-pointer hover:text-blue-500 transition-colors">模型</span>
          <span class="mx-2">></span>
          <span class="text-gray-900">{{ model.title }}</span>
        </nav>
      </div>
    </section>
    <section>
      <!--信息卡-->
      <div class="container mx-auto px-8 py-4 max-w-6xl space-y-6">
        <div class="bg-white rounded-md shadow-sm">
          <div class="flex flex-col lg:flex-row gap-8">
            <div class="w-full lg:w-2/3 relative group">
              <div class="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                <ModelViewer v-if="isRendering" :model-url="model.fileUrl" class="w-full h-full" />
                <img v-else :src="model.thumbnailUrl || '/placeholder.png'" alt="cover"
                  class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <button @click="toggleRender"
                  class="absolute top-4 left-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2">
                  <svg v-if="!isRendering" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {{ isRendering ? '关闭3D预览' : '预览3D模型' }}
                </button>
              </div>
            </div>

            <div class="flex-1 flex flex-col">
              <div class="flex items-start justify-between mb-4">
                <h1 class="text-3xl font-bold text-gray-900 leading-tight">
                  {{ model.title }}
                  <span
                    class="inline-block align-middle ml-2 px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium tracking-wide">SFW</span>
                </h1>
              </div>
              <div class="flex flex-wrap gap-2 mb-8 mt-4">
                <span v-for="tag in (model.tags || ['Windows', '3D Asset', 'Character'])" :key="tag"
                  class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer">
                  {{ tag }}
                </span>
              </div>
              <div class="flex flex-wrap gap-3 mb-6">
                <button class="btn-text-white w-1/2" @click="handleDownload">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  下载
                </button>
                <button
                  class="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors"
                  @click="handleLike" :title="model.isLiked ? '取消点赞' : '点赞'">
                  <svg class="w-6 h-6" :class="{ 'fill-current text-red-500': model.isLiked }" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  class="w-12 h-12 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-yellow-500 transition-colors"
                  @click="handleCollect" :title="model.isCollected ? '取消收藏' : '收藏'">
                  <svg class="w-6 h-6" :class="{ 'fill-current text-yellow-500': model.isCollected }" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              </div>
              <p class="text-xs text-gray-400 mb-8">您的点赞和收藏是对作者最大的支持</p>

              <div class="mt-auto pt-3 pb-1 px-4 border-t border-gray-100 flex items-center justify-between">

                <div class="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  @click="router.push(`/user/${model.author?.id}`)">
                  <img :src="model.author?.avatar || '/default-avatar.png'"
                    class="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
                  <div>
                    <p class="text-sm font-bold text-gray-900 leading-none">{{ model.author?.username || 'Unknown' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-4 text-xs text-gray-400 font-medium">
                  <span class="flex items-center gap-1 hover:text-gray-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {{ model.likeCount || 0 }}
                  </span>
                  <span class="flex items-center gap-1 hover:text-gray-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    {{ model.collectCount || 0 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!--导航栏-->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl space-y-6">
        <div class="space-y-6 bg-white rounded-md shadow-sm">
          <div class="flex p-1 space-x-1 bg-gray-100 rounded-xl">
            <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
              class="w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 focus:outline-none"
              :class="[
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              ]">
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
    <section>
      <!--内容区-->
      <div class="container mx-auto px-8 py-4 max-w-6xl space-y-6">
        <!--模型信息-->
        <div v-if="activeTab === 'info'" class="space-y-8">
          <section class="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 class="text-xl font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-4">模型介绍</h2>
            <div class="prose max-w-none text-gray-600 leading-relaxed">
              <p>{{ model.description || '暂无介绍' }}</p>
            </div>
          </section>

          <section class="bg-white rounded-[20px] p-8 shadow-sm">
            <h2 class="text-xl font-bold text-gray-900 mb-6 border-l-4 border-blue-500 pl-4">模型截图</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div v-for="(url, index) in (model.previewUrls || [])" :key="index"
                class="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-zoom-in">
                <img :src="url" class="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <div v-if="!model.previewUrls?.length"
                class="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                暂无截图
              </div>
            </div>
          </section>
        </div>

        <!-- Author Info Tab -->
        <div v-if="activeTab === 'author'" class="space-y-8">
          <section class="bg-white rounded-[20px] p-8 shadow-sm">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-6">
                <img :src="model.author?.avatar || '/default-avatar.png'"
                  class="w-24 h-24 rounded-full object-cover ring-4 ring-blue-50" />
                <div>
                  <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ model.author?.username || 'Unknown' }}</h2>
                  <p class="text-gray-500 max-w-2xl">{{ model.author?.bio || '这位作者很懒，什么都没写~' }}</p>
                </div>
              </div>
              <button @click="handleFollow"
                class="px-8 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                :class="isFollowing ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'">
                <svg v-if="!isFollowing" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isFollowing ? '已关注' : '关注作者' }}
              </button>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              更多作品
            </h3>
            <div v-if="authorModels.length" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <ModelCard v-for="item in authorModels" :key="item.id" :model="item" @click="goToDetail(item.id)" />
            </div>
            <div v-else class="text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
              暂无其他作品
            </div>
          </section>
        </div>

        <!-- Other Tabs Placeholders -->
        <div v-if="activeTab === 'links'" class="bg-white rounded-[20px] p-12 text-center text-gray-400 shadow-sm">
          资源链接功能开发中...
        </div>
        <div v-if="activeTab === 'discuss'" class="bg-white rounded-[20px] p-12 text-center text-gray-400 shadow-sm">
          完善中
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { modelsApi, followApi, userApi, likeApi, collectApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import ModelViewer from '@/components/ModelViewer.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import ModelCard from '@/components/ModelCard.vue'
import CommentSection from '@/components/CommentSection.vue'

const backendBase = import.meta.env.VITE_API_BASE_URL || ''

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toastRef = ref(null)

const modelId = computed(() => route.params.id)

const model = ref({
  id: null,
  title: 'Loading...',
  description: '',
  category: '',
  tags: [],
  fileUrl: '',
  thumbnailUrl: '',
  previewUrls: [],
  author: null,
  likeCount: 0,
  collectCount: 0,
  createdAt: new Date().toISOString(),
  isLiked: false,
  isCollected: false
})

const authorModels = ref([])
const isFollowing = ref(false)
const isRendering = ref(false)
const activeTab = ref('info')

const tabs = [
  { id: 'info', label: '模型信息' },
  { id: 'author', label: '作者信息' },
  { id: 'links', label: '资源链接' },
  { id: 'discuss', label: '讨论区域' }
]

const toggleRender = () => {
  isRendering.value = !isRendering.value
}

const buildUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

const normalizeModel = (data) => ({
  ...model.value,
  ...data,
  fileUrl: buildUrl(data?.fileUrl),
  thumbnailUrl: buildUrl(data?.thumbnailUrl),
  tags: data?.tags || model.value.tags,
  previewUrls: (data?.previewUrls || []).map(buildUrl),
  isLiked: data?.likedByUser ?? data?.isLiked ?? false,
  isCollected: data?.collectedByUser ?? data?.isCollected ?? false
})

const handleDownload = () => {
  if (!model.value.fileUrl) {
    toastRef.value?.show('暂无下载链接', 'error')
    return
  }
  window.open(model.value.fileUrl, '_blank')
}

const handleLike = async () => {
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    return
  }
  try {
    if (model.value.isLiked) {
      await likeApi.unlike(model.value.id)
      model.value.isLiked = false
      model.value.likeCount = Math.max(0, model.value.likeCount - 1)
      toastRef.value?.show('已取消点赞', 'success')
    } else {
      await likeApi.like(model.value.id)
      model.value.isLiked = true
      model.value.likeCount++
      toastRef.value?.show('点赞成功', 'success')
    }
  } catch (e) {
    console.error(e)
    toastRef.value?.show('操作失败', 'error')
  }
}

const handleCollect = async () => {
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    return
  }
  try {
    if (model.value.isCollected) {
      await collectApi.uncollect(model.value.id)
      model.value.isCollected = false
      model.value.collectCount = Math.max(0, model.value.collectCount - 1)
      toastRef.value?.show('已取消收藏', 'success')
    } else {
      await collectApi.collect(model.value.id)
      model.value.isCollected = true
      model.value.collectCount++
      toastRef.value?.show('收藏成功', 'success')
    }
  } catch (e) {
    console.error(e)
    toastRef.value?.show('操作失败', 'error')
  }
}

const checkFollowStatus = async (authorId) => {
  const targetId = authorId || model.value.author?.id
  if (!authStore.isLoggedIn || !targetId) return
  if (targetId == authStore.userId) return
  try {
    const res = await followApi.checkStatus(targetId)
    isFollowing.value = res.data.isFollowing
  } catch (e) {
    console.error(e)
  }
}

const handleFollow = async () => {
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    router.push('/login')
    return
  }
  const authorId = model.value.author?.id
  if (!authorId) return

  try {
    if (isFollowing.value) {
      await followApi.unfollow(authorId)
      isFollowing.value = false
      toastRef.value?.show('已取消关注', 'success')
    } else {
      await followApi.follow(authorId)
      isFollowing.value = true
      toastRef.value?.show('关注成功', 'success')
    }
  } catch (e) {
    console.error(e)
    toastRef.value?.show('操作失败', 'error')
  }
}

const goToDetail = (id) => {
  router.push(`/model/${id}`)
}

const loadAuthor = async (authorId) => {
  if (!authorId) return
  try {
    const res = await userApi.getById(authorId)
    model.value.author = res.data
    await checkFollowStatus(authorId)
  } catch (e) {
    console.error('failed to load author', e)
  }
}

const loadAuthorModels = async (authorId) => {
  if (!authorId) return
  try {
    const res = await modelsApi.getByAuthor(authorId)
    authorModels.value = Array.isArray(res.data) ? res.data.filter(m => m.id !== model.value.id).slice(0, 8) : []
  } catch (e) {
    console.error(e)
    authorModels.value = []
  }
}

const loadModel = async () => {
  if (!modelId.value) return
  try {
    const { data } = await modelsApi.getById(modelId.value)
    model.value = normalizeModel(data)

    const authorId = data?.authorId || model.value.author?.id
    if (authorId) {
      await loadAuthor(authorId)
      await loadAuthorModels(authorId)
    }
  } catch (err) {
    console.error('get model detail failed', err)
    toastRef.value?.show('获取模型详情失败', 'error')
  }
}

onMounted(() => {
  loadModel()
})
</script>
