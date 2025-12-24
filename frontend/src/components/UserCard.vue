<template>
  <!-- 主容器布局：垂直模式为卡片样式(带hover位移)，水平模式为列表项样式 -->
  <div @click="handleClick"
    class="bg-white rounded shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-100 overflow-hidden"
    :class="layoutClasses">

    <!-- 头像容器：垂直模式下添加底部间距 -->
    <div :class="avatarContainerClasses">
      <!-- 头像尺寸：垂直模式较大(w-20)，水平模式较小(w-16) -->
      <img :src="user.avatarUrl" alt="Avatar" class="rounded-full object-cover border bg-gray-50"
        :class="avatarSizeClasses" />
    </div>

    <!-- 信息区容器：垂直模式文字居中，水平模式自动填充剩余空间 -->
    <div :class="infoContainerClasses">
      <p class="font-medium text-gray-800 truncate" :title="user.username">
        {{ user.username }}
      </p>
      <!-- 只在垂直模式(主页推荐创作者)展示bio -->
      <p v-if="layout === 'vertical'" class="text-xs text-gray-500 truncate mt-0.5">
        {{ user.bio ? user.bio : "no bio" }}
      </p>
      <!-- 只在水平模式(模型详情界面/用户主页)展示"关注"按钮 -->
      <div v-if="layout === 'horizontal' && showAction" class="mt-2" @click.stop>
        <button @click="handleFollow"
          class="px-4 py-1.5 rounded text-sm w-full transition-colors flex justify-center items-center gap-1" :class="followedByUser
            ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            : 'bg-green-500 text-white hover:bg-green-600'">
          <span v-if="isLoading" class="animate-spin">⟳</span>
          <span>{{ buttonText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  layout: {
    type: String,
    default: 'vertical',
    validator: (value) => ['vertical', 'horizontal'].includes(value)
  },
  showAction: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const authStore = useAuthStore()

const followedByUser = ref(props.user.followedByUser || false)

watch(() => props.user.followedByUser, (newVal) => {
  followedByUser.value = newVal
})

const buttonText = computed(() => {
  return followedByUser.value ? '已关注' : '关注'
})

const handleFollow = async () => {
  if (!authStore.checkLogin()) return

  const previousState = followedByUser.value
  followedByUser.value = !previousState

  try {
    await api.post(`/api/users/${props.user.id}/follow`)
  } catch (error) {
    console.error('关注失败', error)
    followedByUser.value = previousState
    alert('操作失败，请重试')
  }
}

const handleClick = () => {
  router.push(`/user/${props.user.id}`)
}

const layoutClasses = computed(() => props.layout === 'vertical' ? 'flex flex-col items-center p-4 hover:-translate-y-1 transition-transform duration-200' : 'flex items-center gap-4 p-4')
const avatarContainerClasses = computed(() => props.layout === 'vertical' ? 'mb-3' : 'flex-shrink-0')
const avatarSizeClasses = computed(() => props.layout === 'vertical' ? 'w-20 h-20' : 'w-16 h-16')
const infoContainerClasses = computed(() => props.layout === 'vertical' ? 'w-full text-center' : 'flex-1 overflow-hidden min-w-0')
</script>
