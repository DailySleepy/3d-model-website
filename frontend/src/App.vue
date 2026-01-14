<template>
  <div id="app">
    <div :class="['w-full mx-0', showTopbar ? 'xl:mx-auto' : '']">
      <header v-if="showTopbar" class="fixed top-0 left-0 w-full z-50 h-[72px] bg-white shadow">
        <TopBar />
      </header>
      <main :class="{ 'pt-[76px]': showTopbar, 'h-screen': !showTopbar }">
        <router-view />
      </main>
    </div>
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '@/components/TopBar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()

const showTopbar = computed(() => {
  return !route.meta.hideTopbar
})
</script>
