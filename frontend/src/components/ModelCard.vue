<template>
  <div @click="handleClick"
    :class="[
      'relative h-[340px] bg-white rounded shadow cursor-pointer border border-gray-100 overflow-hidden flex flex-col transition-all duration-300',
      !menuOpen ? 'group hover:shadow-lg hover:-translate-y-1' : ''
    ]">

    <img :src="model.thumbnailUrl" alt="thumbnail"
      class="w-full object-cover bg-gray-100 transition-all duration-300 ease-in-out flex-1 min-h-0">

    <div class="p-4">
      <h3 class="font-semibold mb-1 truncate transition-colors duration-300 group-hover:text-blue-600 text-lg"
        :title="model.title">
        {{ model.title }}
      </h3>

      <div
        class="grid grid-rows-[1fr] opacity-100 transition-all duration-300 ease-in-out group-hover:grid-rows-[0fr] group-hover:opacity-0">
        <div class="overflow-hidden">
          <p class="text-gray-600 text-sm mb-2 mt-1 truncate">
            {{ model.description || '暂无简介' }}
          </p>
          <p v-if="!hideAuthor" class="text-sm text-gray-500 truncate">
            作者: {{ authorName || 'Unknown' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 管理按钮 -->
    <button
      v-if="showManage"
      @click.stop="menuOpen = true"
      class="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white border border-gray-200/60 shadow-sm text-gray-500 hover:text-gray-700 transition-all hover:scale-105"
      title="管理作品"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
      </svg>
    </button>

    <!-- 覆盖层操作面板 -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="menuOpen"
        class="absolute inset-0 bg-white/90 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6 space-y-4"
        @click.stop
      >
        <h4 class="text-gray-900 font-bold text-lg tracking-wide border-b border-gray-100 pb-2 w-full text-center">作品管理</h4>
        <div class="flex flex-col w-full gap-2.5">
          <!-- 未来可添加：置顶 / 设为私有 -->
          <button
            @click="handleDeleteClick"
            class="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除作品
          </button>
          <button
            @click="menuOpen = false"
            class="w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            返回
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api'

const router = useRouter()
const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  showManage: {
    type: Boolean,
    default: false
  },
  hideAuthor: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete'])

const authorName = ref()
const menuOpen = ref(false)

const handleClick = () => {
  router.push(`/model/${props.model.id}`)
}

const loadAuthor = async (authorId) => {
  if (!authorId) return
  try {
    const res = await userApi.getById(authorId)
    authorName.value = res.data.username
  } catch (e) {
    console.error('failed to load author', e)
  }
}

const handleDeleteClick = () => {
  menuOpen.value = false
  emit('delete', props.model.id)
}

onMounted(() => {
  if (!props.hideAuthor) {
    loadAuthor(props.model.authorId)
  }
})

</script>
