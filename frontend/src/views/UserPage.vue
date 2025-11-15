<template>
  <div class="flex flex-col">
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
              <router-link to="/user/settings"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑信息
              </router-link>
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                开始创作
              </button>
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
              <div class="p-12 flex flex-col items-center justify-center text-center text-sm text-gray-500 space-y-4">
                <div class="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-4xl text-blue-400">
                  :(
                </div>
                <p v-if="activeTab === 'comments'">还没有发布过评论哦噢</p>
                <p v-else-if="activeTab === 'favorites'">收藏夹还是空空的，快去挑选喜欢的作品吧～</p>
                <p v-else>暂时还没有发布过模型，期待你的第一篇创作！</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const followersCount = ref(0)
const followingCount = ref(0)
const charmPoints = ref({ current: 2, total: 5 })
const activeTab = ref('comments')

const tabs = [
  { label: '评论', value: 'comments' },
  { label: '收藏夹', value: 'favorites' },
  { label: '发布模型', value: 'models' }
]

const quickStats = [
  { key: 'models', label: '模型', value: 0, iconPath: 'M12 6l7 4-7 4-7-4 7-4zm0 8v4m-4 0h8' },
  { key: 'comments', label: '评论', value: 0, iconPath: 'M8 10h8m-8 4h5m-1 5l-4 4v-4H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-3l-3 4v-4' },
  { key: 'messages', label: '消息', value: 0, iconPath: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z' },
  { key: 'favorites', label: '收藏', value: 0, iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.383-2.46a1 1 0 00-1.175 0l-3.383 2.46c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.547 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z' }
]

const username = computed(() => authStore.username || 'Default')
const userAvatar = computed(() => authStore.avatar || '')
const userInitial = computed(() => username.value.charAt(0).toUpperCase())
const CreatedAt = computed(() => authStore.CreateAt || '加入于N个月前')
const charmProgress = computed(() =>
  Math.min(100, Math.max(0, (charmPoints.value.current / charmPoints.value.total) * 100))
)
</script>