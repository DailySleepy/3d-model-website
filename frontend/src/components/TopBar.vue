<template>
  <div class="container mx-auto px-8 py-4 max-w-6xl flex justify-center items-center w-full h-20">
    <nav class="flex items-center w-full flex-nowrap whitespace-nowrap gap-4 md:gap-8">
      <div class="whitespace-nowrap">
        <router-link to="/" class="text-2xl font-bold whitespace-nowrap">ModelCraft</router-link>
      </div>
      <div class="flex-1 flex justify-center">
        <div class="hidden md:flex items-center mx-4 lg:mx-10">
          <input v-model="searchInput" type="text" placeholder="搜索模型或作者..."
            class="w-72 lg:w-96 border rounded-l px-4 py-2 focus:outline-none focus:border-blue-500"
            @keyup.enter="handleSearch">
          <button @click="handleSearch"
            class="bg-blue-500 text-white px-6 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap">
            搜索
          </button>
        </div>
      </div>
      <!-- 登录前样式-->
      <div v-if="!authStore.isLoggedIn" class="flex items-center space-x-6 md:space-x-10 whitespace-nowrap">
        <router-link to="/login" class="btn-text-blue">登录</router-link>
        <router-link to="/register" class="btn-text-white">注册</router-link>
      </div>
      <!-- 登录后样式-->
      <div v-else class="flex items-center gap-4 md:gap-6 whitespace-nowrap">

        <!-- 消息 -->
        <div class="relative group h-full flex items-center">
          <button class="relative p-2 text-gray-600 hover:text-blue-500 transition-colors">
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"
              class="right-entry-icon">
              <path
                d="M15.435 17.7717H4.567C2.60143 17.7717 1 16.1723 1 14.2047V5.76702C1 3.80144 2.59942 2.20001 4.567 2.20001H15.433C17.3986 2.20001 19 3.79943 19 5.76702V14.2047C19.002 16.1703 17.4006 17.7717 15.435 17.7717ZM4.567 4.00062C3.59327 4.00062 2.8006 4.79328 2.8006 5.76702V14.2047C2.8006 15.1784 3.59327 15.9711 4.567 15.9711H15.433C16.4067 15.9711 17.1994 15.1784 17.1994 14.2047V5.76702C17.1994 4.79328 16.4067 4.00062 15.433 4.00062H4.567Z"
                fill="currentColor"></path>
              <path
                d="M9.99943 11.2C9.51188 11.2 9.02238 11.0667 8.59748 10.8019L8.5407 10.7635L4.3329 7.65675C3.95304 7.37731 3.88842 6.86226 4.18996 6.50976C4.48954 6.15544 5.0417 6.09699 5.4196 6.37643L9.59412 9.45943C9.84279 9.60189 10.1561 9.60189 10.4067 9.45943L14.5812 6.37643C14.9591 6.09699 15.5113 6.15544 15.8109 6.50976C16.1104 6.86409 16.0478 7.37731 15.6679 7.65675L11.4014 10.8019C10.9765 11.0667 10.487 11.2 9.99943 11.2Z"
                fill="currentColor"></path>
            </svg>
            <span v-if="notificationStore.unreadTotal > 0"
              class="absolute top-0 right-0 transform translate-x-1 -translate-y-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
              {{ notificationStore.unreadTotal > 99 ? '99+' : notificationStore.unreadTotal }}
            </span>
          </button>

          <div class="absolute right-0 top-full pt-2 w-48 hidden group-hover:block z-50">
            <div class="bg-white rounded-md shadow-lg border border-gray-100 py-1 overflow-hidden">
              <button v-for="item in notifications" :key="item.type" @click="goToNotification(item.type)" :class="[
                'block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-500 transition-colors',
              ]">
                {{ item.label }}
                <span v-if="getUnreadCount(item.type) > 0"
                  class="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center scale-90">
                  {{ getUnreadCount(item.type) > 99 ? '99+' : getUnreadCount(item.type) }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- 用户头像 -->
        <router-link :to="userLink" class="flex items-center gap-2 whitespace-nowrap">
          <div
            class="w-10 h-10 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center transition-opacity hover:opacity-80">
            <span v-if="!userAvatar">{{ userInitial }}</span>
            <img v-else :src="userAvatar" alt="用户头像" class="w-full h-full rounded-full object-cover" />
          </div>
        </router-link>

        <!-- 退出登录按钮-->
        <button @click="handleLogout" class="btn-text-white ml-3">
          退出
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const searchInput = ref('')
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const userLink = computed(() => `/user/${authStore.userId || ''}`)
const userInitial = computed(() => (authStore.username || 'U').charAt(0).toUpperCase())
const userAvatar = computed(() => authStore.avatar || '')

const handleSearch = () => {
  if (searchInput.value) {
    let newQuery = {
      q: searchInput.value,
      page: 1
    }
    if (route.path === '/search') { // 当前就在搜索页的话, 保留搜索选项(models/users, hot/time)
      newQuery = {
        ...route.query,
        ...newQuery
      }
    }
    router.push({ path: '/search', query: newQuery })
  }
}

const notifications = [
  { type: 'reply', label: '回复我的' },
  { type: 'like', label: '赞与收藏' },
  { type: 'follow', label: '新增关注' },
  { type: 'system', label: '系统通知' },
  { type: 'chat', label: '我的私信' }
]

const getUnreadCount = (type) => {
  switch (type) {
    case 'reply': return notificationStore.unreadCountReply
    case 'like': return notificationStore.unreadCountLike
    case 'follow': return notificationStore.unreadCountFollow
    case 'system': return notificationStore.unreadCountSystem
    case 'chat': return 0 // TODO: 私信未读数
    default: return 0
  }
}

const goToNotification = (tabName) => {
  router.push({
    path: '/notification',
    query: { tab: tabName }
  })
}

let pollingTimer = null

const startPolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)

  notificationStore.fetchNotifications()

  pollingTimer = setInterval(() => {
    notificationStore.fetchNotifications()
  }, 10000) // 10s
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})

watch(() => authStore.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    startPolling()
  } else {
    stopPolling()
    notificationStore.$reset()
  }
})

// 退出登录
const handleLogout = () => {
  authStore.logout()
  router.push('/')
}
</script>
