<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-5"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-5"
  >
    <div
      v-if="isVisible"
      class="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md bg-white shadow-lg rounded-lg px-4 py-3 flex items-start space-x-3 border border-gray-100 text-black"
    >
      <div class="flex-shrink-0 pt-0.5">
        <svg v-if="type === 'success'" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="type === 'error'" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <svg v-else class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div class="flex-1 pt-0.5">
        <p class="text-base leading-5 whitespace-pre-line font-medium text-gray-800">
          {{ message }}
        </p>
      </div>

      <button 
        type="button"
        class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
        @click="hide"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'

const isVisible = ref(false)
const message = ref('')
const type = ref('info') // 'success', 'error', 'info'
let timer = null

const show = (msg, msgType = 'info', duration = 3000) => {
  if (timer) clearTimeout(timer)

  message.value = msg
  type.value = msgType
  isVisible.value = true

  if (duration > 0) {
    timer = setTimeout(() => {
      hide()
    }, duration)
  }
}

const hide = () => {
  isVisible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

defineExpose({ show, hide })
</script>