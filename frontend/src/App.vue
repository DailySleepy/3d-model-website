<template>
  <div id="app">
    <div class="w-full mx-0 xl:mx-auto">
      <header class="fixed top-0 left-0 w-full z-50 h-[72px] bg-white shadow">
        <TopBar />
      </header>
      <main class="pt-[76px]">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import TopBar from '@/components/TopBar.vue'
</script>
