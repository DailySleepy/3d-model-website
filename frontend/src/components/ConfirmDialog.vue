<template>
  <div v-if="state.visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl" @click.stop>
      <div class="px-6 py-4 border-b border-gray-100">
        <div class="text-lg font-semibold text-gray-900">{{ state.title }}</div>
      </div>
      <div class="px-6 py-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
        {{ state.message }}
      </div>
      <div class="px-6 pb-5 flex justify-end gap-3">
        <button class="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          @click="handleCancel">
          {{ state.cancelText }}
        </button>
        <button class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          @click="handleConfirm">
          {{ state.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue'

const state = reactive({
  visible: false,
  title: '提示',
  message: '',
  confirmText: '确认',
  cancelText: '取消'
})

let resolver = null

export const confirmDialog = (options = {}) => {
  const config = typeof options === 'string' ? { message: options } : options

  if (resolver) {
    resolver(false)
  }

  resolver = null
  state.title = config.title || '提示'
  state.message = config.message || ''
  state.confirmText = config.confirmText || '确认'
  state.cancelText = config.cancelText || '取消'
  state.visible = true

  return new Promise(resolve => {
    resolver = resolve
  })
}

const resolveConfirm = (result) => {
  state.visible = false
  if (resolver) {
    resolver(result)
    resolver = null
  }
}

export default {
  name: 'ConfirmDialog',
  setup() {
    const handleCancel = () => {
      resolveConfirm(false)
    }

    const handleConfirm = () => {
      resolveConfirm(true)
    }

    return {
      state,
      handleCancel,
      handleConfirm
    }
  }
}
</script>
