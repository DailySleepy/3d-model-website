<template>
  <transition
    enter-active-class="transition-opacity duration-300 ease-out"
    leave-active-class="transition-opacity duration-200 ease-in"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
      @click="$emit('close')"
    >
      <div class="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-zinc-900 border border-zinc-850" @click.stop>
        <img :src="imageUrl" class="max-w-full max-h-[80vh] object-contain select-none" />
        <button
          type="button"
          @click="$emit('close')"
          class="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors cursor-pointer text-xl"
        >
          ×
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  }
})

defineEmits(['close'])
</script>
