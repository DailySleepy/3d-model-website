<template>
  <div id="app">
    <header class="fixed top-0 left-0 w-full z-50 bg-white shadow">
      <nav class="flex justify-center items-center p-4 space-x-10">
        <router-link to="/" class="text-2xl font-bold">3D模型分享</router-link>
        <SearchBar />
        <!-- 登录前样式 -->
         <div v-if="!authStore.isLoggedIn" class="flex items-center p-4 space-x-10">
          <router-link to="/login" class="text-gray-600 hover:text-gray-800">登录</router-link>
          <router-link to="/register" class="text-blue-600 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800">注册</router-link>
        </div>
        <!-- 登录后样式 -->
         <div v-else class="flex items-center p-4 space-x-10">
          <!-- 用户头像和用户名 -->
           <router-link to="/user" class="flex items-center gap-2">
             <img
               :src="authStore.avatarUrl"
               :alt="authStore.username"
               class="w-8 h-8 rounded-full"
             />
           </router-link>
          <!-- 退出登录按钮 -->
          <button
            @click="handleLogout"
            class="text-gray-600 hover:text-gray-800 px-3 py-1 border rounded hover:bg-gray-50"
          >
            退出
          </button>
        </div>
      </nav>
    </header>
    <main class="pt-20">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SearchBar from '@/components/SearchBar.vue'

const authStore = useAuthStore()
const router = useRouter()

// 退出登录
const handleLogout = () => {
  authStore.logoutAccount()
  router.push('/')
}
</script>
