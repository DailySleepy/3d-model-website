<template>
  <section>
    <div class="container mx-auto px-8 py-4 max-w-6xl">
      <nav class="text-1xl text-gray-600">
        <router-link to="/" class="hover:underline">主页</router-link>
        <span class="mx-2">></span>
        <span class="text-gray-900">消息中心</span>
      </nav>
    </div>
  </section>
  <div class="container mx-auto px-8 py-4 max-w-6xl">
    <div class="flex items-center justify-between pb-3">
      <h1 class="text-3xl font-bold">消息中心</h1>
      <button @click="notificationStore.markAllAsRead"
        class="btn-text-white"
        :disabled="notificationStore.unreadTotal === 0">
        全部已读
      </button>
    </div>
    <!-- <h2 class="text-sm text-gray-600">当你点击按钮后，会全部已读所有消息</h2> -->

    <div class="flex border-b border-gray-200 mb-6">
      <button v-for="item in tabs" :key="item.type" @click="switchTab(item.type)"
        class="relative px-6 py-3 font-medium text-sm focus:outline-none transition-colors mr-2"
        :class="currentTab === item.type ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'">
        {{ item.label }}

        <span v-if="getUnreadCount(item.type) > 0"
          class="ml-1 px-1.5 py-0.5 text-xs text-white bg-red-500 rounded-full min-w-[1.25rem] inline-flex items-center justify-center transform -translate-y-0.5">
          {{ getUnreadCount(item.type) > 99 ? '99+' : getUnreadCount(item.type) }}
        </span>

        <span v-if="currentTab === item.type" class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
      </button>
    </div>

    <div class="min-h-[400px] bg-white rounded-lg shadow-sm border border-gray-100 relative">
      <div v-if="currentTab === 'chat'" class="h-[640px]">
        <ChatBox />
      </div>

      <template v-else>
        <div v-if="currentList.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-400">
          <p>暂无消息</p>
        </div>

        <ul v-else>
          <li v-for="note in currentList" :key="note.id" @click="handleItemClick(note)"
            class="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'bg-blue-50/40': !note.isRead }">
            <div class="flex items-center gap-4">
              <div v-if="note.fromUser" class="flex-shrink-0 w-10 h-10">
                <router-link :to="`/user/${note.fromUser.id}`" @click.stop>
                  <img :src="note.fromUser.avatar"
                    class="w-full h-full object-cover rounded-full bg-gray-200 transition-opacity hover:opacity-80" />
                </router-link>
              </div>

              <div class="text-sm">
                <template v-if="note.type != 'SYSTEM'">
                  <div>
                    <span class="font-bold">{{ note.fromUser.username }}</span>
                    <span class="text-gray-500 mx-1">
                      {{ getActionText(note) }}
                    </span>
                    <span v-if="note.model && (!note.comment || !note.comment.parentId)" class="text-blue-600">
                      {{ note.model.title }}
                    </span>
                    <span v-else-if="note.model && note.comment && note.comment.parentId"
                      class="text-gray-400 text-xs ml-1">
                      (在 {{ note.model.title }} 中)
                    </span>
                  </div>
                  <div v-if="note.comment" class="text-gray-600 text-sm mt-1">{{ note.comment.content }}</div>
                </template>
                <div v-else>
                  系统通知
                </div>
                <div class="text-xs text-gray-400 mt-1">{{ formatTime(note.createdAt) }}</div>
              </div>
            </div>

            <div v-if="!note.isRead" class="w-2 h-2 bg-red-500 rounded-full"></div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification'
import ChatBox from '@/components/ChatBox.vue'

const route = useRoute()
const router = useRouter()
const notificationStore = useNotificationStore()

const tabs = notificationStore.tabs

const currentTab = computed(() => route.query.tab || 'reply')

const currentList = computed(() =>
  notificationStore.getList(currentTab.value)
)

const getUnreadCount = (type) => {
  return notificationStore.getUnreadCount(type)
}

const switchTab = (type) => {
  router.replace({ query: { ...route.query, tab: type } })
}

const markAsRead = (noteid) => {
  notificationStore.markAsRead(noteid)
}

const handleItemClick = (note) => {
  markAsRead(note.id)
  if (note.model != null) {
    router.push(`/model/${note.model.id}`) // 有模型就跳转模型
  }
  else if (note.fromUser != null) {
    router.push(`/user/${note.fromUser.id}`) // 没模型有用户就跳转用户
  }
}

const getActionText = (note) => {
  if (note.type === 'COMMENT') {
    if (note.comment && note.comment.parentId)
      return '回复了你的评论'
    else
      return '评论了你的模型'
  }

  const map = {
    'LIKE': '赞了',
    'COLLECT': '收藏了',
    'FOLLOW': '关注了你',
    'PUBLISH': '发布了新模型'
  }
  return map[note.type] || ''
}

const formatTime = (t) => t ? t.split('T')[0] : ''

onMounted(() => {
  notificationStore.fetchNotifications()
})
</script>
