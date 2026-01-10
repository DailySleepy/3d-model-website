// stores/notification.js
import { notificationApi } from '@/api'
import { defineStore } from 'pinia'
// import { useChatStore } from '@/stores/chat'

export const useNotificationStore = defineStore('notification', {
  state : () => ({
    notifications : [],
    isLoading : false,
  }),

  getters : {
    replyList : (state) => state.notifications.filter(n => n.type === 'COMMENT'),
    // likeList : (state) => state.notifications.filter(n => n.type === 'LIKE'),
    likeList: (state) => state.notifications.filter(n => ['LIKE', 'COLLECT'].includes(n.type)),
    followList : (state) => state.notifications.filter(n => n.type === 'FOLLOW'),
    systemList : (state) => state.notifications.filter(n => n.type === 'SYSTEM'),

    unreadTotal: (state) => {
      const notificationUnread = state.notifications.filter(n => !n.isRead).length
      // const chatStore = useChatStore()
      // return notificationUnread + chatStore.totalUnreadCount
      return notificationUnread
    },

    unreadCountReply() { return this.replyList.filter(n => !n.isRead).length },
    unreadCountLike() { return this.likeList.filter(n => !n.isRead).length },
    unreadCountFollow() { return this.followList.filter(n => !n.isRead).length },
    unreadCountSystem() { return this.systemList.filter(n => !n.isRead).length },
    unreadCountChat: () => {
        // const chatStore = useChatStore()
        // return chatStore.totalUnreadCount
        return 0
    }
  },

  actions : {
    async fetchNotifications() {
      this.isLoading = true
      // const chatStore = useChatStore()
      try {
        await Promise.all([
            notificationApi.getAll().then(res => this.notifications = res.data.data),
            // chatStore.loadConversations()
        ])
        // console.log("notifications", this.notifications)
        // chatStore.connectWebSocket()
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
    }
  }
})
