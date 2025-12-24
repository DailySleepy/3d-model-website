// store/auth.js
import { defineStore } from 'pinia'
import router from '@/router'
import { authApi } from '@/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.user?.id || null,
    username: (state) => state.user?.username || '',
    email: (state) => state.user?.email || '',
    avatar: (state) => state.user?.avatar || ''
  },

  actions: {
    setSession(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },

    clearSession() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },

    // 发送验证码
    async sendCode(email) {
      try {
        await authApi.sendCode(email)
        return { success: true, message: '验证码已发送' }
      } catch (e) {
        const msg = e?.response?.data || e?.message || '发送失败'
        return { success: false, message: msg }
      }
    },

    // 注册
    async register(payload) {
      try {
        await authApi.register(payload)
        return { success: true, message: '注册成功，请登录' }
      } catch (e) {
        const msg = e?.response?.data || e?.message || '注册失败'
        return { success: false, message: msg }
      }
    },

    // 登录
    async login(identifier, password) {
      try {
        const resp = await authApi.login({ identifier, password })
        const { token, id, username, email, avatar } = resp.data
        this.setSession(token, { id, username, email, avatar })
        return { success: true, message: '登录成功' }
      } catch (e) {
        const msg = e?.response?.data || e?.message || '登录失败'
        return { success: false, message: msg }
      }
    },

    // 忘记密码
    async forgot(email) {
      try {
        await authApi.forgot(email)
        return { success: true, message: '重置码已发送，请查收邮箱' }
      } catch (e) {
        const msg = e?.response?.data || e?.message || '发送失败'
        return { success: false, message: msg }
      }
    },

    // 重置密码
    async resetPassword(email, newPassword) {
      try {
        await authApi.resetPassword({ email, newPassword })
        return { success: true, message: '密码已重置，请使用新密码登录' }
      } catch (e) {
        const msg = e?.response?.data || e?.message || '重置失败'
        return { success: false, message: msg }
      }
    },

    logout() {
      this.clearSession()
      router.push('/login')
    }
  }
})
