<template>
    <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <nav class="absolute top-40 left-40 text-1xl text-gray-600">
      <router-link to="/" class="hover:underline">主页</router-link>
      <span class="mx-2">></span>
      <span class="text-gray-900">{{ authStore.username }}的用户中心</span>
    </nav>
        <!-- 左侧：用户资料卡片 -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm p-6 sticky top-24">
            <!-- 头像 -->
            <div class="flex justify-center mb-4">
              <div class="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold">
                <span v-if="!userAvatar">{{ userInitial }}</span>
                <img
                  v-else
                  :src="userAvatar"
                  alt="Avatar"
                  class="w-full h-full rounded-full object-cover"
                />
              </div>
            </div>

            <!-- 用户名 -->
            <h1 class="text-xl font-bold text-center mb-2">{{ username }}</h1>

            <!-- 用户角色 -->
            <div class="flex justify-center mb-4">
              <span class="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">用户</span>
            </div>

            <!-- 社交统计 -->
            <div class="text-center text-sm text-gray-600 mb-4 space-y-1">
              <div>{{ followersCount }} 人关注 TA, {{ followingCount }} 正在关注</div>
            </div>

            <!-- 操作按钮 -->
            <div class="space-y-3">
              <router-link
                to="/user/settings"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>编辑信息</span>
              </router-link>
              <button
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>开始创作</span>
              </button>
            </div>
          </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const followersCount = ref(0)
const followingCount = ref(0)
</script>