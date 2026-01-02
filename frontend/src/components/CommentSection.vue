<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mt-4">
    <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
      评论 <span class="text-sm font-normal text-gray-500">({{ total }})</span>
    </h2>

    <div v-if="authStore.user!=null">
      <CommentInput ref="mainInputRef" :userAvatar="user?.avatar" placeholder="分享你的想法..." buttonText="发布评论"
        :loading="submitting" @submit="handleMainSubmit" />
    </div>

    <div class="space-y-6">
      <div v-if="loading && comments.length === 0" class="text-center text-gray-400 py-4">加载中...</div>
      <div v-else-if="comments.length === 0" class="text-center text-gray-400 py-8">暂无评论，快来抢沙发吧~</div>

      <div v-for="comment in comments" :key="comment.id"
        class="flex-col gap-4 group border-b border-gray-200 pb-4 mb-4 items-start text-left">
        <CommentItem :comment="comment" @reply="openReplyBox(comment.id, comment.user, comment.id)"
          @delete="handleDelete(comment.id, true)" />

        <div v-if="currentReplyToId === comment.id" class="mt-4 pl-12 animate-fade-in">
          <CommentInput :userAvatar="user?.avatar" :placeholder="replyPlaceholder" buttonText="回复" :loading="submitting"
            :showCancel="true" :autoFocus="true" @submit="(content) => handleReplySubmit(content, comment)"
            @cancel="closeReplyBox" />
        </div>

        <div v-if="comment.children?.length > 0" class="p-4 mt-3 ml-12">

          <div class="space-y-4">
            <div v-for="reply in (comment.isExpanded ? comment.children : comment.children.slice(0, 3))"
              :key="reply.id">
              <CommentItem :comment="reply" @reply="openReplyBox(comment.id, reply.user, reply.id)"
                @delete="handleDelete(reply.id, false, comment.id)" />

              <div v-if="currentReplyToId === reply.id" class="mt-4 pl-10 animate-fade-in">
                <CommentInput :userAvatar="user?.avatar" :placeholder="replyPlaceholder" buttonText="回复"
                  :loading="submitting" :showCancel="true" :autoFocus="true"
                  @submit="(content) => handleReplySubmit(content, comment)" @cancel="closeReplyBox" />
              </div>
            </div>
          </div>

          <div v-if="comment.children.length > 3 && !comment.isExpanded" class="mt-3">
            <button @click="comment.isExpanded = true"
              class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 group transition-colors">
              <span>展开剩余 {{ comment.children.length - 3 }} 条回复</span>
              <svg xmlns="http://www.w3.org/2000/svg"
                class="h-3 w-3 transition-transform duration-200 group-hover:translate-y-0.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div v-if="comment.children.length > 3 && comment.isExpanded" class="mt-3">
            <button @click="comment.isExpanded = false"
              class="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-2 group ml-8">
              <span>收起</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 transition-transform duration-200 rotate-180"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
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
import { commentsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { inject, ref, watch } from 'vue'
import CommentInput from './CommentInput.vue'
import CommentItem from './CommentItem.vue'
import { storeToRefs } from 'pinia'

const props = defineProps({
  modelId: {
    type: [String, Number],
    required: true
  }
})

const authStore = useAuthStore()
const showToast = inject('showToast')

const { user } = storeToRefs(authStore)
const comments = ref([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = ref(false)

const currentReplyToId = ref(null)
const currentReplyToUser = ref(null)
const replyPlaceholder = ref('')
const mainInputRef = ref(null)

const openReplyBox = (rootId, targetUser, targetId) => {
  if (!authStore.checkLogin()) return

  currentReplyToId.value = targetId
  currentReplyToUser.value = targetUser
  replyPlaceholder.value = `回复 @${targetUser?.username}...`
}

const closeReplyBox = () => {
  currentReplyToId.value = null
  currentReplyToUser.value = null
}

const handleMainSubmit = async (content) => {
  if (!authStore.checkLogin()) return

  await submitComment({
    content,
    parentId: null,
    replyToUserId: null
  }, true)
  mainInputRef.value?.clear()
}

const handleReplySubmit = async (content, rootComment) => {
  if (!authStore.checkLogin()) return

  let targetUserId = null
  if (currentReplyToId.value != rootComment.id) {
    targetUserId = currentReplyToUser.value?.id
  }

  await submitComment({
    content,
    parentId: rootComment.id,
    replyToUserId: targetUserId
  }, false, rootComment)

  closeReplyBox()
}

const submitComment = async (params, isRoot, rootComment = null) => {
  submitting.value = true
  try {
    const res = await commentsApi.create({
      modelId: props.modelId,
      content: params.content,
      parentId: params.parentId,
      replyToUserId: params.replyToUserId
    })

    const newComment = {
      ...res.data,
      user: authStore.user,
      replyToUser: isRoot ? null : currentReplyToUser.value,
      isExpanded: false,
      children: []
    }

    if (isRoot) {
      comments.value.unshift(newComment)
    } else {
      if (!rootComment.children) rootComment.children = []
      rootComment.children.push(newComment)
    }

    total.value++
    showToast('发布成功', 'success')
  } catch (error) {
    console.error(error)
    showToast('发布失败', 'error')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id, isRoot, rootId = null) => {
  if (!confirm('确认删除这条评论吗？')) return

  try {
    await commentsApi.delete(id)
    if (isRoot) {
      comments.value = comments.value.filter(c => c.id !== id)
    } else {
      const root = comments.value.find(c => c.id === rootId)
      if (root && root.children) root.children = root.children.filter(c => c.id !== id)
    }
    total.value--
    showToast('删除成功', 'success')
  }
  catch (error) {
    console.error(error)
    showToast('删除失败', 'error')
  }
}

const fetchComments = async (currentPage = 1, append = false) => {
  if (!props.modelId) return

  loading.value = true
  try {
    const res = await commentsApi.list({
      params: {
        modelId: props.modelId,
        page: currentPage,
        size: 10
      }
    })

    const newItems = res.data.items || []
    newItems.forEach(item => {
      item.isExpanded = false
    })
    console.log(res.data)
    total.value = res.data.total || 0

    if (append) {
      comments.value = [...comments.value, ...newItems]
    } else {
      comments.value = newItems
    }

    hasMore.value = comments.value.length < total.value
  } catch (error) {
    console.error('Fetch comments failed:', error)
    showToast('评论获取失败', 'error')
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  page.value++
  fetchComments(page.value, true)
}

watch(() => props.modelId, (newId) => {
  if (newId) {
    page.value = 1
    fetchComments(1, false)
  }
}, { immediate: true })

</script>
