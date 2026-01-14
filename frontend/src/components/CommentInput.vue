<template>
  <div class="flex gap-4 p-4 w-full">
    <div
      class="w-10 h-10 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
      <span v-if="!userAvatar">{{ userInitial }}</span>
      <img v-else :src="userAvatar" alt="用户头像" class="w-full h-full rounded-full object-cover" />
    </div>

    <div class="flex-1">
      <textarea v-model="content" ref="textareaRef" :placeholder="placeholder"
        @keydown.ctrl.enter="handleSubmit" @keydown.meta.enter="handleSubmit"
        class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px] text-sm text-gray-800"></textarea>

      <div class="flex justify-end mt-2 gap-2">
        <button v-if="showCancel" @click="$emit('cancel')" class="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
          取消
        </button>

        <button @click="handleSubmit" :disabled="loading || !content.trim()"
          class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm transition-colors">
          {{ loading ? '发送中...' : buttonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 接收属性
const props = defineProps({
  userAvatar: String,
  placeholder: { type: String, default: '分享你的想法...' },
  buttonText: { type: String, default: '发布' },
  loading: Boolean,
  showCancel: Boolean,
  autoFocus: Boolean
})

const authStore = useAuthStore()
const emit = defineEmits(['submit', 'cancel'])
const content = ref('')
const textareaRef = ref(null)
const userInitial = computed(() => {
  const name = authStore.user?.username || authStore.username || 'U'
  return name.charAt(0).toUpperCase()
})

onMounted(() => {
  if (props.autoFocus && textareaRef.value) {
    textareaRef.value.focus()
  }
})

const handleSubmit = () => {
  if (!content.value.trim()) return
  emit('submit', content.value)
}

const clear = () => {
  content.value = ''
}

defineExpose({ clear })
</script>
