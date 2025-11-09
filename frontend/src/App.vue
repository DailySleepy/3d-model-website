<template>
  <div id="app">
    <header class="fixed top-0 left-0 w-full z-50 bg-white shadow">
      <nav class="flex justify-between items-center p-4">
        <router-link to="/" class="text-2xl font-bold">3D模型分享</router-link>
        <SearchBar />
        <!-- TODO: 用户逻辑 -->
        <div>登录 注册 创作</div>
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
