// src/stores/chat.js
import { chatApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [], // 对话列表(每个列表显示最新一条消息)
    currentChatUser: null,
    messages: [], // 当前对话的消息
    socket: null,
    isConnected: false,
    serverUnreadCount: 0,
    reconnectTimer: null,
  }),

  getters: {
    totalUnreadCount: (state) => {
      return state.serverUnreadCount || state.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    },
  },

  actions: {
    connectWebSocket() {
      if (this.isConnected || this.socket) return

      const authStore = useAuthStore()
      const token = authStore.token
      if (!token) return

      // '__API_URL__' 来自 vite.config.js
      // eslint-disable-next-line no-undef
      const baseUrl = typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://localhost:8080'
      const wsBase = baseUrl.replace(/^http/, 'ws')
      const wsUrl = `${wsBase}/ws?token=${token}`

      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = () => {
        this.isConnected = true
        console.log('WebSocket Connected')
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleIncomingMessage(data)
        } catch (e) {
          console.error('WebSocket message parse error', e)
        }
      }

      this.socket.onclose = (e) => {
        this.isConnected = false
        this.socket = null

        if (e.code !== 1000 && authStore.token) {
          console.log('ws连接已断开, 尝试在3秒后重连')
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
          this.reconnectTimer = setTimeout(() => {
              this.connectWebSocket()
          }, 3000)
        }
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket Error', error)
      }
    },

    disconnect() {
      if (this.socket) {
        this.socket.close(1000, "User Logged Out") // 发送 1000 正常关闭代码
        this.socket = null
      }
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      this.isConnected = false
    },

    async fetchUnreadCount() {
      try {
        const res = await chatApi.getTotalUnreadCount();
        if (res.data && res.data.data) {
          this.serverUnreadCount = res.data.data.count;
        }
      } catch (e) {
        console.error("获取未读数失败", e);
      }
    },

    handleIncomingMessage(message) {
      // 后端字段: id, senderId, receiverId, content, createdAt, sender{...}, receiver{...}
      const authStore = useAuthStore()
      const myId = authStore.user.id

      // 确定对方的ID (如果是我多端同步发的, 对方就是receiverId; 如果是别人发的, 对方就是senderId)
      const isMe = message.senderId === myId
      const otherUserId = isMe ? message.receiverId : message.senderId

      if(isMe) {
        // console.log("收到了自己的消息")
        const lastMsg = this.messages[this.messages.length - 1]
        if (lastMsg && lastMsg.senderId === myId && lastMsg.isTemp && lastMsg.content === message.content) {
          // console.log("收到了自己当前设备发的消息")
          Object.assign(lastMsg, message) // 更新属性
          lastMsg.isTemp = false // 移除临时标记
          return
        }
      }

      // 当前正打开着这个人的聊天框
      if (this.currentChatUser && this.currentChatUser.id === otherUserId) {
        this.messages.push(message)
        // 如果是对方发来的, 尝试标记已读
        if (!isMe) {
          this.markMessageAsRead(message.id)
        }
      }

      const convIndex = this.conversations.findIndex(c => c.user_id === otherUserId)

      if (convIndex !== -1) { // 会话已存在
        const conv = this.conversations[convIndex]
        conv.last_message = message.content
        conv.last_time = message.createdAt

        // 如果不是我发的, 且没有打开该窗口, 未读数+1
        if (!isMe && (!this.currentChatUser || this.currentChatUser.id !== otherUserId)) {
          conv.unread_count = (conv.unread_count || 0) + 1
        }

        this.conversations.splice(convIndex, 1)
        this.conversations.unshift(conv)
      } else { // 新会话
        // 手动构造一个临时会话对象减少请求
        const otherUserObj = isMe ? message.receiver : message.sender
        if (otherUserObj) {
          const newConv = {
            user_id: otherUserId,
            username: otherUserObj.username,
            avatar: otherUserObj.avatar,
            last_message: message.content,
            last_time: message.createdAt,
            unread_count: isMe ? 0 : 1
          }
          this.conversations.unshift(newConv)
        } else {
          this.loadConversations()
        }
      }
    },

    // 获取会话列表(每个会话的最后一条消息)
    async loadConversations() {
      try {
        const res = await chatApi.getConversations()
        this.fetchUnreadCount()
        const authStore = useAuthStore()
        const myId = authStore.user.id

        this.conversations = res.data.data.map(msg => {
          // 确定对方 (如果是我多端同步发的, 对方就是receiver; 如果是别人发的, 对方就是sender)
          const isMe = msg.senderId === myId
          const otherUser = isMe ? msg.receiver : msg.sender

          return {
            user_id: otherUser.id,
            username: otherUser.username,
            avatar: otherUser.avatar,
            last_message: msg.content,
            last_time: msg.createdAt,
            unread_count: msg.unreadCount ? msg.unreadCount : 0
          }
        })
        // 从用户主页点击私聊进入对话会指定currentChatUser
        if (this.currentChatUser) {
          // 检查服务器列表里有没有这个人
          const exists = this.conversations.find(c => c.user_id === this.currentChatUser.id)

          if (!exists) {
            // 如果服务器里没有, 说明是第一次对话, 则根据currentChatUser手动构造一个临时会话对象
            // 不获取历史对话, 不标记已读
            const tempConv = {
              user_id: this.currentChatUser.id,
              username: this.currentChatUser.username,
              avatar: this.currentChatUser.avatar,
              last_message: '',
              last_time: new Date().toISOString(),
              unread_count: 0
            }
            this.conversations.unshift(tempConv)
          }
          else {
            // 如果服务器里有, 说明之前对话过, 获取历史对话并标记已读
            this.selectChat(this.currentChatUser)
          }
        }
      } catch (e) {
        console.error('加载会话失败', e)
      }
    },

    async openConversation(targetUser) {
      this.currentChatUser = targetUser
    },

    async selectChat(user) {
      this.currentChatUser = user
      this.messages = []

      // 标记已读
      const conv = this.conversations.find(c => c.user_id === user.id)
      if (conv) {
        if (conv.unread_count > 0) {
          conv.unread_count = 0
          this.markConversationAsRead(conv, user.id)
        }
      }

      try {
        const res = await chatApi.getConversationHistory(user.id)
        this.messages = res.data.data
        // 由于前面没有对 markConversationAsRead 进行 await, 这里取到的信息可能仍然是"未读", 这无伤大雅
      } catch (e) {
        console.error(e)
      }
    },

    async sendMessage(content) {
      if (!this.currentChatUser) return

      const authStore = useAuthStore()

      // 手动构造消息对象, 模拟后端dto的结构
      const tempId = Date.now()
      const newMsg = {
        id: tempId,
        senderId: authStore.user.id,
        receiverId: this.currentChatUser.id,
        content: content,
        createdAt: new Date().toISOString(),
        isRead: false,
        isTemp: true, // 手动构造的对象添加临时标记
        sender: {
          id: authStore.user.id,
          username: authStore.user.username,
          avatar: authStore.user.avatar
        },
        receiver: {
          id: this.currentChatUser.id,
          username: this.currentChatUser.username,
          avatar: this.currentChatUser.avatar
        }
      }

      // 1. 推入本地消息列表 (立即上屏)
      this.messages.push(newMsg)

      // 2. 更新左侧会话列表 (更新最新消息预览和时间并置顶会话)
      const convIndex = this.conversations.findIndex(c => c.user_id === this.currentChatUser.id)
      if (convIndex !== -1) {
        const conv = this.conversations[convIndex]
        conv.last_message = newMsg.content
        conv.last_time = newMsg.createdAt
        this.conversations.splice(convIndex, 1)
        this.conversations.unshift(conv)
      }

      // 先乐观更新, 再发请求
      const payload = {
        receiverId: this.currentChatUser.id,
        content: content
      }

      try {
        await chatApi.sendMessage(payload)
      } catch (e) {
        console.error('发送请求失败', e)
        // TODO: 处理失败
      }
    },

    clearCurrentChat() {
      this.currentChatUser = null;
      this.messages = [];
    },

    async markMessageAsRead(id) {
       try {
        await chatApi.markMessageRead(id)
       } catch (e) {
        console.error(e)
       }
    },

    async markConversationAsRead(conv, targetUserId) {
      try {
        await chatApi.markConversationRead(targetUserId)
        this.serverUnreadCount = 0
        conv.unread_count = 0
      } catch (e) {
        console.error(e)
      }
    },

    async markAllMessagesAsRead() {
      try {
        await chatApi.markAllRead()
        this.serverUnreadCount = 0
        this.conversations.forEach(conv => {
            conv.unread_count = 0
        })
      } catch (e) {
        console.error(e)
      }
    },
  }
})
