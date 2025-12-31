<template>
  <div class="flex flex-col">
    <ToastMessage ref="toastRef" />
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">{{ username }}的用户主页</span>
        </nav>
      </div>
    </section>
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <div class="grid gap-8 lg:grid-cols-[320px,1fr]">
          <!-- 左边用户卡片 -->
          <div class="bg-white rounded-2xl shadow-md p-8 space-y-4">
            <div class="flex flex-col items-center text-center space-y-3">
              <div
                class="w-28 h-28 rounded-full bg-blue-500 text-white text-3xl font-semibold flex items-center justify-center">
                <span v-if="!userAvatar">{{ userInitial }}</span>
                <img v-else :src="userAvatar" alt="用户头像" class="w-full h-full rounded-full object-cover" />
              </div>
              <div>
                <h1 class="text-2xl font-semibold text-gray-900">{{ username }}</h1>
              </div>
            </div>

            <div class="text-center text-sm text-gray-500">
              <div class="flex flex-col space-y-1">
                <span>{{ followersCount }} 人关注 TA</span>
                <span>{{ followingCount }} 正在关注</span>
              </div>
            </div>

            <div class="space-y-3 text-sm text-gray-600">
              <div class="flex items-center justify-center text-gray-500">{{ CreatedAt }}</div>
            </div>

            <div class="space-y-3">
              <template v-if="isCurrentUser">
                <router-link to="/user/settings" class="btn-text-blue w-full">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑信息
                </router-link>
                <router-link to="/upload" class="btn-text-white w-full">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  开始创作
                </router-link>
              </template>
              <template v-else>
                <button 
                  class="w-full gap-1"
                  :class="isFollowing ? 'btn-base bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent' : 'btn-text-blue'"
                  @click="handleFollow"
                >
                  <svg v-if="!isFollowing" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ isFollowing ? '已关注' : '关注TA' }}
                </button>
              </template>
            </div>
          </div>

          <!-- 右侧内容卡片 -->
          <div class="space-y-6">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div v-for="stat in quickStats" :key="stat.key"
                class="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-2">
                <div class="flex items-center justify-between text-sm text-gray-500">
                  <span>{{ stat.label }}</span>
                  <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" stroke-width="2"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="stat.iconPath" />
                  </svg>
                </div>
                <div class="text-2xl font-semibold text-gray-900">{{ stat.value }}</div>
              </div>
            </div>

            <div class="bg-white rounded-2xl shadow-md">
              <div class="flex border-b border-gray-100 text-sm font-medium text-gray-500">
                <button v-for="tab in tabs" :key="tab.value" class="flex-1 py-4 text-center transition-all"
                  :class="activeTab === tab.value ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/30' : 'hover:text-gray-900'"
                  @click="activeTab = tab.value">
                  {{ tab.label }}
                </button>
              </div>
              <div v-if="activeTab === 'models'" class="p-6">
                <div v-if="models.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <ModelCard v-for="item in models" :key="item.id" :model="item" @click="goToDetail(item.id)" />
                </div>
                <div v-else class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                  <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                    :(
                  </div>
                  <p>暂时还没有发布过模型，期待你的第一篇创作！</p>
                </div>
              </div>
              <div v-else class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                  :(
                </div>
                <p v-if="activeTab === 'comments'">还没有发布过评论哦噢</p>
                <p v-else>收藏夹还是空空的，快去挑选喜欢的作品吧～</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { userApi, modelsApi, followApi } from '@/api'
import ModelCard from '@/components/ModelCard.vue'
import ToastMessage from '@/components/ToastMessage.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const user = ref(null)
const followersCount = ref(0)
const followingCount = ref(0)
const charmPoints = ref({ current: 2, total: 5 })
const activeTab = ref('comments')
const models = ref([])
const isFollowing = ref(false)
const toastRef = ref(null)

const tabs = [
  { label: '评论', value: 'comments' },
  { label: '收藏夹', value: 'favorites' },
  { label: '发布模型', value: 'models' }
]

const quickStats = ref([
  { key: 'models', label: '模型', value: 0, iconPath: 'M12 6l7 4-7 4-7-4 7-4zm0 8v4m-4 0h8' },
  { key: 'comments', label: '评论', value: 0, iconPath: 'M8 10h8m-8 4h5m-1 5l-4 4v-4H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-3 4v-4' },
  { key: 'messages', label: '消息', value: 0, iconPath: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z' },
  { key: 'favorites', label: '收藏', value: 0, iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.383-2.46a1 1 0 00-1.175 0l-3.383 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.547 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z' }
])

const username = computed(() => user.value?.username || authStore.username || 'Default')
const userAvatar = computed(() => user.value?.avatar || authStore.avatar || '')
const userInitial = computed(() => username.value.charAt(0).toUpperCase())
const isCurrentUser = computed(() => {
  const currentUserId = authStore.userId
  const pageUserId = route.params.id
  // 如果没有路由参数id，或者路由参数id等于当前登录用户id，则认为是当前用户
  return !pageUserId || pageUserId == currentUserId
})

const CreatedAt = computed(() => {
  const dateStr = user.value?.createdAt || authStore.user?.createdAt
  if (!dateStr) return '加入于未知时间'
  
  const createdDate = new Date(dateStr)
  const now = new Date()
  
  // 计算月份差
  let months = (now.getFullYear() - createdDate.getFullYear()) * 12
  months -= createdDate.getMonth()
  months += now.getMonth()
  
  if (months < 1) {
    // 不足一个月，计算天数
    const diffTime = Math.abs(now - createdDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
    return `加入于 ${diffDays} 天前`
  }
  
  return `加入于 ${months} 个月前`
})

const loadUser = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const res = await userApi.getById(id)
    user.value = res.data
    followersCount.value = res.data.followersCount || 0
    followingCount.value = res.data.followingCount || 0
  } catch (e) {
    console.error('加载用户信息失败', e)
  }
}

const loadStats = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    // 仅拉取模型数量，保持卡片样式
    const res = await modelsApi.getByAuthor(id)
    const modelStat = quickStats.value.find(s => s.key === 'models')
    if (modelStat) modelStat.value = Array.isArray(res.data) ? res.data.length : 0
  } catch (e) {
    console.error('加载模型数据失败', e)
  }
}

const checkFollowStatus = async () => {
  if (isCurrentUser.value) return
  const id = route.params.id
  if (!id) return
  try {
    const res = await followApi.checkStatus(id)
    if (res.data.success) {
      isFollowing.value = res.data.isFollowing
    }
  } catch (e) {
    console.error('检查关注状态失败', e)
  }
}

const handleFollow = async () => {
  const id = route.params.id
  if (!id) return
  
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    router.push('/login')
    return
  }

  try {
    if (isFollowing.value) {
      await followApi.unfollow(id)
      isFollowing.value = false
      followersCount.value--
      toastRef.value?.show('已取消关注', 'success')
    } else {
      await followApi.follow(id)
      isFollowing.value = true
      followersCount.value++
      toastRef.value?.show('关注成功', 'success')
    }
  } catch (e) {
    const msg = e.response?.data?.message || (isFollowing.value ? '取消关注失败' : '关注失败')
    toastRef.value?.show(msg, 'error')
  }
}

const loadModels = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const res = await modelsApi.getByAuthor(id)
    models.value = Array.isArray(res.data) ? res.data : []
  } catch (e) {
    console.error('加载模型列表失败', e)
    models.value = []
  }
}

const goToDetail = (id) => {
  router.push(`/model/${id}`)
}

onMounted(() => {
  loadUser()
  loadStats()
  loadModels()
  checkFollowStatus()
})

watch(
  () => route.params.id,
  () => {
    loadUser()
    loadStats()
    loadModels()
    checkFollowStatus()
  }
)
</script>
