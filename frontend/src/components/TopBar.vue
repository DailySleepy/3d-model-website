<template>
  <div class="container mx-auto px-8 py-4 flex justify-center items-center w-full h-full max-w-6xl">
    <nav class="grid grid-cols-[auto,minmax(0,1fr),auto] items-center w-full gap-4 md:gap-8">

      <div class="flex items-center flex-shrink-0 mr-2 md:mr-4">
        <!-- 网站图标 -->
        <router-link to="/" class="flex items-center gap-2 group mr-2 lg:mr-4">
          <img src="/favicon.png"
            class="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 transition-transform" alt="ModelCraft">
          <span class="hidden md:block text-blue-500 text-base font-bold tracking-tight">
            ModelCraft
          </span>
        </router-link>

        <!-- 排行榜, Lab -->
        <div class="flex items-center gap-2 md:gap-4 text-gray-800 font-medium text-base transition-colors">
          <router-link to="/ranking" class="hover:text-blue-500 whitespace-nowrap">热度排行</router-link>
          <router-link to="/lab" class="hover:text-blue-500 whitespace-nowrap">实验空间</router-link>
          <router-link to="/shadergraph" class="hover:text-blue-500 whitespace-nowrap">着色器画布</router-link>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="flex justify-center min-w-0">
        <div class="hidden md:flex items-center w-full max-w-[560px] mx-4 lg:mx-10">
          <div class="relative w-full">
            <input v-model="searchInput" type="text" placeholder="搜索模型或作者..."
              class="input-modern mt-0 w-full pr-12 rounded-full bg-white/90 border border-white/60 shadow-sm focus:ring-blue-500/20"
              @keyup.enter="handleSearch">
            <button @click="handleSearch"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-4.35-4.35m1.6-4.9a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 登录前样式-->
      <div v-if="!authStore.isLoggedIn" class="flex items-center justify-end space-x-6 md:space-x-10 whitespace-nowrap">
        <router-link to="/login" class="btn-text-blue">登录</router-link>
        <router-link to="/register" class="btn-text-white">注册</router-link>
      </div>
      <!-- 登录后样式-->
      <div v-else class="flex items-center justify-end gap-4 md:gap-6 whitespace-nowrap">

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

        <!-- 开始创作按钮 -->
        <router-link to="/upload" class="btn-text-white ml-3 gap-1">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.0824 10H14.1412C15.0508 10 15.7882 10.7374 15.7882 11.6471V12.8824C15.7882 13.792 15.0508 14.5294 14.1412 14.5294H3.84707C2.93743 14.5294 2.20001 13.792 2.20001 12.8824V11.6471C2.20001 10.7374 2.93743 10 3.84707 10H5.90589" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M8.99413 11.2353L8.99413 3.82353" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12.0823 6.29413L8.9941 3.20589L5.90587 6.29413" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
          投稿
        </router-link>
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

const notifications = notificationStore.tabs

const getUnreadCount = (type) => {
  return notificationStore.getUnreadCount(type)
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
  }, 3000000) // 3000s
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
</script>
