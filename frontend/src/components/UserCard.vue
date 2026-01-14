<template>
  <div @click="handleClick"
    class="group bg-white rounded shadow hover:shadow-md cursor-pointer border border-gray-100 overflow-hidden flex flex-col items-center p-4 hover:-translate-y-1 transition-transform duration-200">

    <div class="mb-3">
      <div
        class="rounded-full bg-blue-500 text-white font-semibold flex items-center justify-center overflow-hidden border border-gray-100 w-20 h-20 text-xl">
        <span v-if="!user.avatar">{{ userInitial }}</span>
        <img v-else :src="user.avatar" alt="Avatar" class="w-full h-full object-cover" />
      </div>
    </div>

    <div class="w-full text-center">
      <p class="font-medium text-gray-800 truncate group-hover:text-blue-600" :title="user.username">
        {{ user.username }}
      </p>

      <p class="text-xs text-gray-500 truncate mt-0.5">
        {{ user.bio ? user.bio : "no bio" }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  }
})

const router = useRouter()

const userInitial = computed(() => {
  const name = props.user?.username || ''
  return name ? name.charAt(0).toUpperCase() : '?'
})

const handleClick = () => {
  router.push(`/user/${props.user.id}`)
}
</script>
