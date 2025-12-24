<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-4">
    <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
      评论 <span class="text-sm font-normal text-gray-500">({{ total }})</span>
    </h2>

    <div class="flex gap-4 mb-8">
      <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
        <img :src="user?.avatar" class="w-full h-full object-cover" />
      </div>
      <div class="flex-1">
        <textarea v-model="content" placeholder="分享你的想法..."
          class="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none min-h-[80px]"></textarea>
        <div class="flex justify-end mt-2">
          <button @click="handleSubmit" :disabled="submitting || !content.trim()"
            class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            {{ isLoggedIn ? (submitting ? '发送中...' : '发布评论') : '请先登录' }}
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div v-if="loading && comments.length === 0" class="text-center text-gray-400 py-4">加载中...</div>
      <div v-else-if="comments.length === 0" class="text-center text-gray-400 py-8">暂无评论，快来抢沙发吧~</div>

      <div v-for="comment in comments" :key="comment.id" class="flex gap-4 group">
        <router-link :to="`/user/${comment.userId}`"
          class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          <img :src="comment.userAvatar" class="w-full h-full object-cover" />
        </router-link>

        <div class="flex-1 border-b border-gray-100 pb-4">
          <div class="flex justify-between items-baseline mb-1">
            <router-link :to="`/user/${comment.userId}`"
              class="font-semibold text-gray-800">{{ comment.username }}</router-link>
            <span class="text-xs text-gray-400">{{ formatDate(comment.createdAt) }}</span>
          </div>
          <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">{{ comment.content }}</p>

          <div class="mt-2 flex gap-4 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <button v-if="isCurrentUser(comment.userId)" @click="handleDelete(comment.id)"
              class="hover:text-red-600 cursor-pointer text-red-400">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="hasMore" @click="loadMore" class="w-full text-center text-blue-500 mt-4 text-sm hover:underline py-2">
      {{ loading ? '加载中...' : '查看更多评论' }}
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import api from '@/api'

const props = defineProps({
  modelId: {
    type: [String, Number],
    required: true
  }
})

const router = useRouter()
const authStore = useAuthStore()
const { isLoggedIn, user } = storeToRefs(authStore)

const comments = ref([])
const content = ref('')
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)

const fetchComments = async (currentPage = 1, append = false) => {
  if (!props.modelId) return

  loading.value = true
  try {
    const res = await api.get('/api/comments', {
      params: {
        modelId: props.modelId,
        page: currentPage,
        size: 10
      }
    })

    // TODO: 适配后端返回结构
    let newItems = res.data.content || []
    newItems = [
      { id: 1, userid: 66, username: "Bob", content: "这个模型太棒了！", createdAt: "2025" },
      { id: 2, userid: 99, username: "Charlie", content: "希望能下载使用。", createdAt: "2024" } // TODO
    ]
    total.value = res.data.totalElements || 0

    if (append) {
      comments.value = [...comments.value, ...newItems]
    } else {
      comments.value = newItems
    }

    hasMore.value = comments.value.length < total.value
  } catch (error) {
    console.error('Fetch comments failed:', error)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!checkLogin()) return
  if (!content.value.trim()) return

  submitting.value = true
  try {
    const res = await api.post('/api/comments', {
      modelId: props.modelId,
      content: content.value
    })

    const newComment = res.data
    comments.value.unshift(newComment)
    total.value++
    content.value = ''
  } catch (error) {
    alert('评论失败: ' + (error.response?.data || error.message))
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (commentId) => {
  if (!confirm('确认删除这条评论吗？')) return

  try {
    await api.delete(`/api/comments/${commentId}`)
    comments.value = comments.value.filter(c => c.id !== commentId)
    total.value--
  } catch (error) {
    console.log(error)
    alert('删除失败')
  }
}

const loadMore = () => {
  page.value++
  fetchComments(page.value, true)
}

const checkLogin = () => {
  if (!isLoggedIn.value) {
    if (confirm('请先登录')) router.push('/login')
    return false
  }
  return true
}

const isCurrentUser = (uid) => {
  return isLoggedIn.value && user.value?.id === uid
}

const formatDate = (str) => {
  if (!str) return ''
  return new Date(str).toLocaleString()
}

watch(() => props.modelId, (newId) => {
  if (newId) {
    page.value = 1
    fetchComments(1, false)
  }
}, { immediate: true })

</script>
