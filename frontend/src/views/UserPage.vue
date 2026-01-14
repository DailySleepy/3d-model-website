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
                <p class="mt-2 text-sm text-gray-500">{{ userBio }}</p>
              </div>
            </div>

            <div class="text-center text-sm text-gray-500">
              <div class="flex flex-col space-y-1">
                <button type="button" class="hover:text-blue-600 transition" @click="openFollowModal('followers')">
                  {{ followersCount }}人正在关注{{ followTargetLabel }}
                </button>
                <button type="button" class="hover:text-blue-600 transition" @click="openFollowModal('following')">
                  {{ followTargetLabel }}正在关注{{ followingCount }}人
                </button>
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

                <button
                  class="w-full gap-1 btn-text-white"
                  @click="handleMessage"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  私信
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
                <div v-if="models.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[350px] overflow-y-auto">
                  <ModelCard v-for="item in models" :key="item.id" :model="item" />
                </div>
                <div v-else class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                  <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                    :(
                  </div>
                  <p>暂时还没有发布过模型，期待你的第一篇创作！</p>
                </div>
              </div>
              <div v-else-if="activeTab === 'favorites'" class="p-6">
                <div v-if="favorites.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[350px] overflow-y-auto">
                  <ModelCard v-for="item in favorites" :key="item.id" :model="item" />
                </div>
                <div v-else class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                  <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                    :(
                  </div>
                  <p>收藏夹还是空空的，快去挑选喜欢的作品吧～</p>
                </div>
              </div>
              <div v-else class="p-6">
                <div v-if="comments.length" class="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                  <div v-for="comment in comments" :key="comment.id"
                    class="rounded-2xl border border-gray-100 p-4 hover:bg-gray-50 transition">
                    <router-link :to="`/model/${comment.modelId}`" class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        <img v-if="comment.modelThumbnailUrl" :src="comment.modelThumbnailUrl"
                          class="w-full h-full object-cover" alt="thumbnail" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-blue-600 truncate">
                          {{ comment.modelTitle || '模型详情' }}
                        </p>
                        <p class="text-xs text-gray-400">{{ formatDate(comment.createdAt) }}</p>
                      </div>
                    </router-link>
                    <p class="mt-3 text-sm text-gray-700 leading-relaxed">{{ comment.content }}</p>
                  </div>
                </div>
                <div v-else class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                  <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                    :(
                  </div>
                  <p>还没有发布过评论哦噢</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div v-if="followModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div class="w-full max-w-xl bg-white rounded-2xl shadow-xl">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div class="text-lg font-semibold text-gray-900">{{ followModalTitle }}</div>
          <button class="text-gray-400 hover:text-gray-700 text-2xl leading-none" @click="closeFollowModal">×</button>
        </div>
        <div class="px-6 py-4 max-h-[420px] overflow-y-auto">
          <div v-if="followLoading" class="text-sm text-gray-500">加载中...</div>
          <div v-else-if="!followList.length" class="text-sm text-gray-500">{{ followModalEmptyText }}</div>
          <div v-else class="space-y-3">
            <div v-for="item in followList" :key="item.id"
              class="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition">
              <router-link :to="`/user/${item.id}`" class="flex items-center gap-3 min-w-0" @click="closeFollowModal">
                <div class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  <img v-if="item.avatar" :src="item.avatar" class="w-full h-full object-cover" alt="avatar" />
                  <span v-else class="w-full h-full flex items-center justify-center text-sm text-gray-500">
                    {{ item.username?.charAt(0)?.toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900 truncate">{{ item.username }}</div>
                </div>
              </router-link>
              <div class="flex items-center gap-2 flex-shrink-0">
                <router-link :to="`/user/${item.id}`" class="text-xs text-blue-600 hover:underline"
                  @click="closeFollowModal">去TA主页</router-link>
                <button
                  v-if="authStore.isLoggedIn && item.id !== authStore.userId"
                  class="px-3 py-1 rounded-full text-xs font-medium border transition"
                  :class="item.following
                    ? 'border-gray-300 text-gray-500 hover:border-gray-400'
                    : 'border-blue-500 text-blue-600 hover:bg-blue-50'"
                  @click="toggleFollowUser(item)"
                >
                  {{ item.following ? '已关注' : '关注' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { userApi, modelsApi, followApi } from '@/api'
import ModelCard from '@/components/ModelCard.vue'
import ToastMessage from '@/components/ToastMessage.vue'

const authStore = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const user = ref(null)
const followersCount = ref(0)
const followingCount = ref(0)
const activeTab = ref('models')
const models = ref([])
const favorites = ref([])
const comments = ref([])
const isFollowing = ref(false)
const toastRef = ref(null)
const followModalOpen = ref(false)
const followModalType = ref('followers')
const followList = ref([])
const followLoading = ref(false)
const followTotal = ref(0)

const tabs = [
  { label: '发布模型', value: 'models' },
  { label: '收藏夹', value: 'favorites' },
  { label: '评论', value: 'comments' },
]

const quickStats = ref([
  { key: 'models', label: '模型', value: 0, iconPath: 'M12 6l7 4-7 4-7-4 7-4zm0 8v4m-4 0h8' },
  { key: 'comments', label: '评论', value: 0, iconPath: 'M8 10h8m-8 4h5m-1 5l-4 4v-4H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-3 4v-4' },
  { key: 'likes', label: '点赞', value: 0, iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { key: 'favorites', label: '收藏', value: 0, iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.383-2.46a1 1 0 00-1.175 0l-3.383 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.547 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z' }
])

const setQuickStat = (key, value) => {
  const stat = quickStats.value.find(item => item.key === key)
  if (stat) stat.value = value
}

const username = computed(() => user.value?.username || authStore.username || 'Default')
const userAvatar = computed(() => user.value?.avatar || authStore.avatar || '')
const userBio = computed(() => user.value?.bio || authStore.user?.bio || 'no bio')
const userInitial = computed(() => username.value.charAt(0).toUpperCase())
const isCurrentUser = computed(() => {
  const currentUserId = authStore.userId
  const pageUserId = route.params.id
  // 如果没有路由参数id，或者路由参数id等于当前登录用户id，则认为是当前用户
  return !pageUserId || pageUserId == currentUserId
})
const followTargetLabel = computed(() => (isCurrentUser.value ? '我' : 'TA'))

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

const formatDate = (str) => (str ? new Date(str).toLocaleString() : '')

const followModalTitle = computed(() => {
  const count = followModalType.value === 'followers'
    ? (followTotal.value || followersCount.value)
    : (followTotal.value || followingCount.value)
  if (followModalType.value === 'followers') {
    return `关注${followTargetLabel.value}的人 · ${count}`
  }
  return `${followTargetLabel.value}关注的人 · ${count}`
})

const followModalEmptyText = computed(() => {
  if (followModalType.value === 'followers') {
    return `暂无关注${followTargetLabel.value}的人`
  }
  return `${followTargetLabel.value}还没有关注任何人`
})

const fetchAllPages = async (fetchPage, size = 50) => {
  let page = 1
  let total = null
  const items = []

  while (page <= 100) {
    const res = await fetchPage(page, size)
    const data = res?.data || {}
    const pageItems = Array.isArray(data.items) ? data.items : []
    if (typeof data.total === 'number') total = data.total
    items.push(...pageItems)

    if (pageItems.length < size) break
    if (total !== null && items.length >= total) break
    page += 1
  }

  return { items, total: total ?? items.length }
}

const openFollowModal = async (type) => {
  followModalType.value = type
  followModalOpen.value = true
  await loadFollowList()
}

const closeFollowModal = () => {
  followModalOpen.value = false
  followList.value = []
  followTotal.value = 0
}

const loadFollowList = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  followLoading.value = true
  try {
    const fetcher = followModalType.value === 'followers' ? userApi.getFollowers : userApi.getFollowing
    const data = await fetchAllPages((page, size) => fetcher(id, { page, size }))
    followList.value = data.items
    followTotal.value = data.total
  } catch (e) {
    console.error('加载关注列表失败', e)
    followList.value = []
    followTotal.value = 0
  } finally {
    followLoading.value = false
  }
}

const toggleFollowUser = async (target) => {
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    router.push('/login')
    return
  }

  try {
    if (target.following) {
      await followApi.unfollow(target.id)
      target.following = false
      if (isCurrentUser.value) {
        followingCount.value = Math.max(0, followingCount.value - 1)
        if (followModalType.value === 'following') {
          followList.value = followList.value.filter(item => item.id !== target.id)
        }
      }
      toastRef.value?.show('已取消关注', 'success')
    } else {
      await followApi.follow(target.id)
      target.following = true
      if (isCurrentUser.value) {
        followingCount.value += 1
      }
      toastRef.value?.show('关注成功', 'success')
    }
  } catch (e) {
    const msg = e.response?.data?.message || '操作失败'
    toastRef.value?.show(msg, 'error')
  }
}

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

const loadComments = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const data = await fetchAllPages((page, size) => userApi.getComments(id, { page, size }))
    comments.value = data.items
    setQuickStat('comments', data.total)
  } catch (e) {
    console.error('加载评论数据失败', e)
    comments.value = []
    setQuickStat('comments', 0)
  }
}

const loadFavorites = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const data = await fetchAllPages((page, size) => userApi.getCollections(id, { page, size }))
    favorites.value = data.items
    setQuickStat('favorites', data.total)
  } catch (e) {
    console.error('加载收藏数据失败', e)
    favorites.value = []
    setQuickStat('favorites', 0)
  }
}

const loadLikes = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const res = await userApi.getLikes(id, { page: 1, size: 1 })
    const data = res.data || {}
    setQuickStat('likes', typeof data.total === 'number' ? data.total : 0)
  } catch (e) {
    console.error('加载点赞数据失败', e)
    setQuickStat('likes', 0)
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

const handleMessage = async () => {
  if (!authStore.isLoggedIn) {
    toastRef.value?.show('请先登录', 'error')
    router.push('/login')
    return
  }

  const targetUserId = Number(route.params.id)
  const targetUser = {
    id: targetUserId,
    username: user.value?.username || 'Unknown',
    avatar: user.value?.avatar || ''
  }

  try {
    // 建立/选中会话, 并跳转到通知页面的 chat 标签
    await chatStore.openConversation(targetUser)
    router.push({
        path: '/notification',
        query: { tab: 'chat' }
    })
  } catch (e) {
    console.error('打开会话失败', e)
    toastRef.value?.show('无法开始会话', 'error')
  }
}

const loadModels = async () => {
  const id = route.params.id || authStore.userId
  if (!id) return
  try {
    const res = await modelsApi.getByAuthor(id)
    models.value = Array.isArray(res.data) ? res.data : []
    setQuickStat('models', models.value.length)
  } catch (e) {
    console.error('加载模型列表失败', e)
    models.value = []
    setQuickStat('models', 0)
  }
}

onMounted(() => {
  loadUser()
  loadModels()
  loadComments()
  loadFavorites()
  loadLikes()
  checkFollowStatus()
})

watch(
  () => route.params.id,
  () => {
    if (followModalOpen.value) {
      closeFollowModal()
    }
    loadUser()
    loadModels()
    loadComments()
    loadFavorites()
    loadLikes()
    checkFollowStatus()
  }
)
</script>
