<template>
  <Transition name="fade">
    <div v-if="visible" class="absolute inset-0 bg-[radial-gradient(circle,#222222,#0b0b0b)] flex flex-col justify-center items-center z-[9999] backdrop-blur-[2px]">
      <div class="relative w-[120px] h-[120px] flex justify-center items-center">
        <svg class="-rotate-90" width="120" height="120">
          <circle class="stroke-white/10" stroke-width="8" fill="transparent" r="50" cx="60" cy="60"/>
          <circle class="stroke-cyan-400 transition-[stroke-dashoffset] duration-150 ease-out"
            stroke-width="8" fill="transparent" r="50" cx="60" cy="60"
            stroke-dasharray="314.16"
            :stroke-dashoffset="314.16 * (1 - progress / 100)"/>
        </svg>
        <span class="absolute text-xl font-semibold text-white">{{ progress }}%</span>
      </div>
      <div class="mt-4 text-sm text-zinc-400 uppercase tracking-widest animate-pulse">{{ text }}</div>

      <button
        v-if="cancelable"
        class="mt-8 px-5 py-2 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700 transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-md"
        @click="emit('cancel')"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        取消并返回
      </button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  text: {
    type: String,
    default: 'loading'
  },
  cancelable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel'])
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
