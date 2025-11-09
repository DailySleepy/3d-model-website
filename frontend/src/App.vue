<template>
  <div id="app">
    <header class="fixed top-0 left-0 w-full z-50 bg-white shadow">
      <nav class="flex justify-between items-center p-4">
        <router-link to="/" class="text-2xl font-bold">3D模型分享</router-link>
        <SearchBar />
        <!-- TODO: 用户逻辑 -->
        <router-link to="/login" class="text-gray-600 hover:text-gray-800">登录</router-link>
        <router-link to="/register" class="text-gray-600 hover:text-gray-800">注册</router-link>
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
