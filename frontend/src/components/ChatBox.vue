<template>
  <div class="flex h-full bg-white rounded-lg overflow-hidden border border-gray-200">

    <div class="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
      <div class="p-3 border-b border-gray-200 font-bold text-gray-700">
        最近消息
      </div>
      <div class="overflow-y-auto flex-1">
        <div v-for="conv in chatStore.conversations" :key="conv.user_id" @click="handleSelectChat(conv)"
          class="flex items-center p-3 cursor-pointer hover:bg-white transition-colors relative"
          :class="{ 'bg-blue-50': chatStore.currentChatUser?.id === conv.user_id }">

          <div class="relative">
            <img :src="conv.avatar" class="w-10 h-10 rounded-full object-cover bg-gray-300" />
            <div v-if="conv.unread_count > 0"
              class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">
              {{ conv.unread_count > 99 ? '99+' : conv.unread_count }}
            </div>
          </div>

          <div class="ml-3 flex-1 overflow-hidden">
            <div class="flex justify-between items-baseline">
              <span class="font-medium text-sm truncate">{{ conv.username }}</span>
              <span class="text-xs text-gray-400">{{ formatTime(conv.last_time) }}</span>
            </div>
            <p class="text-xs text-gray-500 truncate mt-1">{{ conv.last_message || '\u00A0' }}</p>
          </div>
        </div>

        <div v-if="chatStore.conversations.length === 0" class="text-center text-gray-400 mt-10 text-sm">
          暂无会话
        </div>
      </div>
    </div>

    <div class="w-2/3 flex flex-col relative">
      <div v-if="!chatStore.currentChatUser" class="flex-1 flex items-center justify-center text-gray-400">
        <div class="text-center">
          <p>选择一个联系人开始聊天</p>
        </div>
      </div>

      <template v-else>
        <div class="p-3 border-b border-gray-200 flex items-center justify-between bg-white z-10">
          <div class="font-bold">{{ chatStore.currentChatUser.username }}</div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref="messageContainer">
          <div v-for="(msg, index) in chatStore.messages" :key="msg.id || index">

            <div v-if="shouldShowTime(index)" class="flex justify-center my-4">
              <div class="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">
                {{ formatTime(msg.createdAt) }}
              </div>
            </div>

            <div class="flex" :class="isMyMessage(msg) ? 'justify-end' : 'justify-start'">
              <div class="max-w-[70%] px-4 py-2 rounded-lg text-sm break-words shadow-sm"
                :class="isMyMessage(msg) ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'">
                {{ msg.content }}
              </div>
            </div>

          </div>
        </div>

        <div class="p-4 bg-white border-t border-gray-200">
          <textarea v-model="inputContent" @keyup.enter="handleSend" placeholder="输入消息..."
            class="w-full outline-none resize-none min-h-[80px] text-sm text-gray-800"></textarea>
          <div class="flex justify-end">
            <button @click="handleSend" :disabled="!inputContent.trim()"
              class="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
              发送
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

const chatStore = useChatStore()
const authStore = useAuthStore()
const inputContent = ref('')
const messageContainer = ref(null)

const isMyMessage = (msg) => {
  return msg.senderId === authStore.user.id
}

const TIME_THRESHOLD = 5 * 60 * 1000 // 用时间对消息分隔的间隔为 5min

const shouldShowTime = (index) => {
  if (index === 0) return true

  const currentMsg = chatStore.messages[index]
  const prevMsg = chatStore.messages[index - 1]

  if (!currentMsg.createdAt || !prevMsg.createdAt) return false

  const currentTime = new Date(currentMsg.createdAt).getTime()
  const prevTime = new Date(prevMsg.createdAt).getTime()

  return (currentTime - prevTime) > TIME_THRESHOLD
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()

  if (isNaN(date.getTime())) return ''

  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();
  const pad = (num) => num.toString().padStart(2, '0') // 格式化日月为两位数

  if (isToday) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (isThisYear) {
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const handleSelectChat = async (conv) => {
  const user = {
    id: conv.user_id,
    username: conv.username,
    avatar: conv.avatar
  }
  await chatStore.selectChat(user)
}

const handleSend = async () => {
  const content = inputContent.value.trim()
  if (!content) return

  await chatStore.sendMessage(content)
  inputContent.value = ''
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

// 监听消息列表变化
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

// 监听当前聊天对象变化
watch(() => chatStore.currentChatUser, () => {
  scrollToBottom()
})

onMounted(() => {
  // 确保ws已连接, 会话列表已加载
  chatStore.connectWebSocket()
  if (chatStore.conversations.length === 0) {
    chatStore.loadConversations()
  }
})

onUnmounted(() => {
  chatStore.clearCurrentChat()
})
</script>
