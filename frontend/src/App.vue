<template>
  <div id="app">
    <header class="fixed top-0 left-0 w-full z-50 bg-white shadow">
      <nav class="flex justify-center items-center p-4 space-x-10">
        <router-link to="/" class="text-2xl font-bold">3D模型分享</router-link>
        <SearchBar />
        <!-- 登录前样式 -->
        <router-link to="/login" class="text-gray-600 hover:text-gray-800">登录</router-link>
        <router-link to="/register" class="text-blue-600 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-800">注册</router-link>
        <!-- TODO: 登录后样式 -->
      </nav>
    </header>
    <main class="pt-20">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import SearchBar from '@/components/SearchBar.vue'
</script>
