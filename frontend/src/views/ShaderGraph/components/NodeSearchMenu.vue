<template>
  <Transition name="fade-scale">
    <div
      ref="menuRef"
      class="absolute bg-zinc-900/95 border border-zinc-800 rounded-xl p-2 w-56 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
      :style="{ left: `${searchMenu.x}px`, top: `${searchMenu.y}px` }"
      @click.stop
    >

    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry';

const props = defineProps({
  searchMenu: {
    type: Object,
    required: true,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close', 'spawnNode'])

const menuRef = ref(null)

const handleOutsideClick = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.12s ease-out;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
</style>
