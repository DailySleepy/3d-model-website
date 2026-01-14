// stores/notification.js
import { notificationApi } from '@/api'
import { defineStore } from 'pinia'
import { useChatStore } from '@/stores/chat'

export const useNotificationStore = defineStore('notification', {
  state : () => ({
    notifications : [],
    isLoading : false,
  }),

  getters : {
    tabs: () => [
      { type: 'reply', label: '回复我的' },
      { type: 'like', label: '收到的赞' },
      { type: 'follow', label: '新增关注' },
      { type: 'system', label: '系统通知' },
      { type: 'publish', label: '关注动态' },
      { type: 'chat', label: '我的私信' },
    ],

    replyList : (state) => state.notifications.filter(n => n.type === 'COMMENT'),
    likeList: (state) => state.notifications.filter(n => ['LIKE', 'COLLECT'].includes(n.type)),
    followList : (state) => state.notifications.filter(n => n.type === 'FOLLOW'),
    systemList : (state) => state.notifications.filter(n => n.type === 'SYSTEM'),
    publishList : (state) => state.notifications.filter(n => n.type === 'PUBLISH'),

    unreadTotal: (state) => {
      const notificationUnread = state.notifications.filter(n => !n.isRead).length
      const chatStore = useChatStore()
      return notificationUnread + chatStore.totalUnreadCount
    },

    unreadCountReply() { return this.replyList.filter(n => !n.isRead).length },
    unreadCountLike() { return this.likeList.filter(n => !n.isRead).length },
    unreadCountFollow() { return this.followList.filter(n => !n.isRead).length },
    unreadCountSystem() { return this.systemList.filter(n => !n.isRead).length },
    unreadCountPublish() { return this.publishList.filter(n => !n.isRead).length },
    unreadCountChat() { return useChatStore().totalUnreadCount },

    getUnreadCount() {
      return (type) => {
        switch (type) {
          case 'reply': return this.unreadCountReply
          case 'like': return this.unreadCountLike
          case 'follow': return this.unreadCountFollow
          case 'system': return this.unreadCountSystem
          case 'publish': return this.unreadCountPublish
          case 'chat': return this.unreadCountChat
          default: return 0
        }
      }
    },

    getList() {
      return (type) => {
        switch (type) {
          case 'reply': return this.replyList
          case 'like': return this.likeList
          case 'follow': return this.followList
          case 'system': return this.systemList
          case 'publish': return this.publishList
          default: return []
        }
      }
    }
  },

  actions : {
    async fetchNotifications() {
      this.isLoading = true
      const chatStore = useChatStore()
      try {
        await Promise.all([
            notificationApi.getAll().then(res => this.notifications = res.data.data),
            chatStore.loadConversations()
        ])
        chatStore.connectWebSocket()
      }
      catch(e) { console.error('获取消息失败', e) }
      finally { this.isLoading = false }
    },

    markAsRead(id) {
      const note = this.notifications.find(n => n.id === id)
      if (note && !note.isRead)
      {
          note.isRead = true
          notificationApi.markAsRead(id)
      }
    },

    markAllAsRead() {
      this.notifications.forEach(n => n.isRead = true)
      notificationApi.markAllAsRead()
      const chatStore = useChatStore()
      chatStore.markAllMessagesAsRead()
    }
  }
})
