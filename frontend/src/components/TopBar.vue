<template>
  <div class="container mx-auto px-8 py-4 max-w-6xl flex justify-center items-center w-full h-20">
    <nav class="flex items-center w-full flex-nowrap whitespace-nowrap gap-4 md:gap-8">
      <div class="whitespace-nowrap">
        <router-link to="/" class="text-2xl font-bold whitespace-nowrap">ModelCraft</router-link>
      </div>
      <div class="flex-1 flex justify-center">
        <div class="hidden md:flex items-center mx-4 lg:mx-10">
        <input
          v-model="query"
          type="text"
          placeholder="搜索模型或作者..."
          class="w-72 lg:w-96 border rounded-l px-4 py-2 focus:outline-none focus:border-blue-500"
          @keyup.enter="handleSearch"
        >
        <button @click="handleSearch" class="bg-blue-500 text-white px-6 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap">
          搜索
        </button>
        </div>
      </div>
      <!-- 登录前样式 -->
      <div v-if="!authStore.isLoggedIn" class="flex items-center space-x-6 md:space-x-10 whitespace-nowrap">
        <router-link to="/login" class="text-gray-600 hover:text-gray-800 whitespace-nowrap">登录</router-link>
        <router-link to="/register" class="text-blue-600 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800 whitespace-nowrap">注册</router-link>
      </div>
      <!-- 登录后样式 -->
      <div v-else class="flex items-center space-x-6 md:space-x-10 whitespace-nowrap">
        <!-- 用户头像和用户名 -->
        <router-link to="/user" class="flex items-center gap-2 whitespace-nowrap">
        <img
          :src="authStore.avatarUrl"
          :alt="authStore.username"
          class="w-8 h-8 rounded-full"
        />
        </router-link>
        <!-- 退出登录按钮 -->
        <button
          @click="handleLogout"
          class="text-gray-600 hover:text-gray-800 px-3 py-1 border rounded hover:bg-gray-50 whitespace-nowrap"
        >
          退出
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const query = ref('')
const authStore = useAuthStore()

const emit = defineEmits(['search'])

const handleSearch = () => {
  if (query.value) {
    router.push({ path: '/search', query: { q: query.value } })
    emit('search', query.value) // UNUSED: 将搜索的内容传递到 App.vue
  }
}

// 退出登录
const handleLogout = () => {
  authStore.logoutAccount()
  router.push('/')
}
</script>



