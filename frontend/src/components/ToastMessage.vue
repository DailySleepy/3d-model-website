<template>
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md pointer-events-none flex flex-col space-y-3">
    <transition-group
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-5"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-5"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-3 flex items-start space-x-3 border border-gray-100 dark:border-gray-700 text-black dark:text-white transition-colors duration-200"
      >
        <div class="flex-shrink-0 pt-0.5">
          <svg v-if="toast.type === 'success'" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else-if="toast.type === 'error'" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg v-else-if="toast.type === 'warning'" class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <svg v-else class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div class="flex-1 pt-0.5">
          <p class="text-base leading-5 whitespace-pre-line font-medium text-gray-800 dark:text-gray-200" v-html="toast.message">
          </p>
          <div v-if="toast.errorDetails" class="mt-2 text-xs">
            <button
              type="button"
              @click="toggleDetails(toast)"
              class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium focus:outline-none flex items-center space-x-1"
            >
              <span>{{ toast.isDetailsExpanded ? '收起详情' : '查看详情' }}</span>
              <svg :class="{'rotate-180': toast.isDetailsExpanded}" class="h-3 w-3 transform transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <pre
              v-show="toast.isDetailsExpanded"
              class="mt-1.5 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap break-all font-mono leading-normal"
            >{{ toast.errorDetails }}</pre>
          </div>
        </div>

        <button
          type="button"
          class="flex-shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
          @click="remove(toast.id)"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 11-1.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

const toggleDetails = (toast) => {
  toast.isDetailsExpanded = !toast.isDetailsExpanded
  if (toast.isDetailsExpanded && toast.timer) {
    clearTimeout(toast.timer)
    toast.timer = null
  }
}

const show = (msg, msgType = 'info', duration = null, error = null) => {
  const id = nextId++

  let toastErrorDetails = null
  if (error) {
    if (typeof error === 'string') {
      toastErrorDetails = error
    } else if (error instanceof Error) {
      toastErrorDetails = error.stack || error.message
    } else if (typeof error === 'object') {
      const apiMsg = error.response?.data?.message || error.response?.data || error.message
      toastErrorDetails = typeof apiMsg === 'object' ? JSON.stringify(apiMsg, null, 2) : apiMsg
    } else {
      toastErrorDetails = String(error)
    }
  }

  if (duration === null || duration === undefined) {
    const baseDuration = error ? 10000 : 3000
    const extension = toasts.value.length * 1500
    duration = baseDuration + extension
  }

  const toast = {
    id,
    message: msg,
    type: msgType,
    isDetailsExpanded: false,
    errorDetails: toastErrorDetails,
    timer: null
  }

  if (duration > 0) {
    toast.timer = setTimeout(() => {
      remove(id)
    }, duration)
  }

  toasts.value.push(toast)
}

const remove = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    const toast = toasts.value[index]
    if (toast.timer) {
      clearTimeout(toast.timer)
    }
    toasts.value.splice(index, 1)
  }
}

const hide = () => {
  toasts.value.forEach(toast => {
    if (toast.timer) {
      clearTimeout(toast.timer)
    }
  })
  toasts.value = []
}

defineExpose({ show, hide })
</script>
