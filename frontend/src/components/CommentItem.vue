<template>
  <div class="flex gap-3 text-left items-start group w-full">
    <router-link :to="`/user/${comment.userId}`"
      class="rounded-full bg-blue-500 text-white font-semibold overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80 flex items-center justify-center"
      :class="isChild ? 'w-6 h-6 mt-0.5 text-xs' : 'w-10 h-10 text-sm'"
    >
      <span v-if="!userAvatar">{{ userInitial }}</span>
      <img v-else :src="userAvatar" alt="用户头像" class="w-full h-full rounded-full object-cover" />
    </router-link>

    <div class="flex-1 min-w-0">
      <div class="flex items-center flex-wrap gap-2">
        <router-link :to="`/user/${comment.userId}`" class="font-semibold text-sm text-gray-400 hover:text-blue-600">
          {{ comment.user?.username }}
        </router-link>

        <span v-if="shouldShowAt" class="text-gray-500 text-sm flex items-center gap-1">
          <span>回复</span>
          <router-link :to="`/user/${comment.replyToUserId}`" class="text-blue-500 hover:underline">
            @{{ comment.replyToUser?.username }}
          </router-link>
        </span>
      </div>

      <div class="mt-1 text-gray-900 break-words text-base leading-relaxed whitespace-pre-wrap">
        {{ comment.content }}
      </div>

      <div class="flex gap-4 mt-1 text-xs text-gray-400 items-center">
        <span>{{ formatDate(comment.createdAt) }}</span>

        <button @click="$emit('reply', comment)" class="hover:text-blue-600 cursor-pointer font-medium">
          回复
        </button>

        <button
          v-if="isCurrentUser"
          @click="$emit('delete', comment.id)"
          class="hover:text-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        >
          删除
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  comment: Object
})

defineEmits(['reply', 'delete'])
const authStore = useAuthStore()

const isCurrentUser = computed(() => authStore.isLoggedIn && authStore.user?.id === props.comment.userId)

const isChild = computed(() => props.comment.parentId != null)

const userAvatar = computed(() => props.comment?.user?.avatar || '')
const userInitial = computed(() => {
  const name = props.comment?.user?.username || ''
  return name ? name.charAt(0).toUpperCase() : '?'
})

const shouldShowAt = computed(() => {
  if (!isChild.value) return false
  return props.comment.replyToUserId != null
})

const formatDate = (str) => str ? new Date(str).toLocaleString() : ''
</script>
