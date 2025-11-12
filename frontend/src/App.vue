<template>
  <div id="app">
    <header class="fixed top-0 left-0 w-full z-50 h-20 bg-white shadow">
      <TopBar />
    </header>
    <main class="pt-20">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import TopBar from '@/components/TopBar.vue'
</script>
