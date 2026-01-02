// stores/notification.js
import {notificationApi} from '@/api'
import {defineStore} from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state : () => ({
    rawNotifications : [],
    isLoading : false,
  }),

  getters : {
    replyList : (state) => state.rawNotifications.filter(n => n.type === 'COMMENT'),
    // likeList : (state) => state.rawNotifications.filter(n => n.type === 'LIKE'),
    likeList: (state) => state.rawNotifications.filter(n => ['LIKE', 'COLLECT'].includes(n.type)),
    followList : (state) => state.rawNotifications.filter(n => n.type === 'FOLLOW'),
    systemList : (state) => state.rawNotifications.filter(n => n.type === 'SYSTEM'),

    unreadTotal : (state) => state.rawNotifications.filter(n => !n.is_read).length,

    unreadCountReply() { return this.replyList.filter(n => !n.is_read).length },
    unreadCountLike() { return this.likeList.filter(n => !n.is_read).length },
    unreadCountFollow() { return this.followList.filter(n => !n.is_read).length },
    unreadCountSystem() { return this.systemList.filter(n => !n.is_read).length }
  },

  actions : {
    async fetchNotifications() {
      this.isLoading = true
        try {
          const res = await notificationApi.getAll()
          this.rawNotifications = res
        }
        catch(e) { console.error('获取消息失败', e) }
        finally { this.isLoading = false }
        // MOCK
        this.rawNotifications = [
          {
              id : 1,
              type : 'COMMENT',
              is_read : false,
              created_at : new Date().toISOString(),
              from_user : {id : 1, username : 'safasdg', avatar : ''},
              model : {id : 1, title : 'cube'},
              comment : {id : 321, content : '666'}
          },
          {
              id : 2,
              type : 'LIKE',
              is_read : false,
              created_at : new Date(Date.now() - 100000).toISOString(),
              from_user : {id : 1, username : 'safasdg', avatar : ''},
              model : {id : 1, title : 'cube'},
          },
          {
              id : 3,
              type : 'COLLECT',
              is_read : false,
              created_at : new Date(Date.now() - 200000).toISOString(),
              from_user : {id : 1, username : 'safasdg', avatar : ''},
              model : {id : 1, title : 'cube'},
          },
          {
              id : 4,
              type : 'SYSTEM',
              is_read : true,
              created_at : new Date(Date.now() - 8000000).toISOString()
          },
          {
              id : 5,
              type : 'FOLLOW',
              is_read : false,
              created_at : new Date(Date.now()).toISOString(),
              from_user : {id : 1, username : 'safasdg', avatar : ''},
          },
        ]
    },

    markAsRead(id) {
      const note = this.rawNotifications.find(n => n.id === id)
      if (note && !note.is_read)
      {
          note.is_read = true
          notificationApi.markAsRead(id)
      }
    },

    markAllAsRead() {
      this.rawNotifications.forEach(n => n.is_read = true)
      notificationApi.markAllAsRead()
    }
  }
})
