<template>
  <div id="app">
    <div class="bg-gray-50">
      <div class="w-full max-w-[1600px] min-w-[1000px] mx-0 xl:mx-auto">
        <header class="fixed top-0 left-0 w-full z-50 h-20 bg-white shadow">
          <TopBar />
        </header>
        <main class="pt-20">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import TopBar from '@/components/TopBar.vue'
</script>
