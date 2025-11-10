import { defineStore } from 'pinia'
import { AuthApi } from '@/api' 

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isLoggedIn: false,
    username: localStorage.getItem('username') || '',
    phone: localStorage.getItem('phone') || '' 
  }),

  getters: {
    // 获取用户名（手机号）
    username: (state) => state.user?.username || state.phone || '',
    // 获取用户头像
    avatarUrl: (state) => state.user?.avatarUrl || 'https://i.pravatar.cc/150',
  },

  actions: {
    // 获取验证码
    async getVerificationCode(phone) {
      try {
        // 调用API（响应拦截器已处理错误，如果成功会返回result，失败会抛出错误）
        const result = await AuthApi.getCode(phone)
        // 响应拦截器确保code === 10000，所以这里直接返回成功
        return { success: true, message: result.msg || '验证码发送成功' }
      } catch (error) {
        return {
          success: false,
          msg: error.message || '验证码发送失败，请稍后重试'
        }
      }
    },

    async registerAccount(username, phone, password, verificationCode ) {
      try {
        const result = await AuthApi.verifyCode(phone, password, verificationCode)
        if (result.code === 10000) {
          this.token = result.data.token
          this.isLoggedIn = true
          this.phone = phone
          localStorage.setItem('token', result.data.token)
          localStorage.setItem('phone', phone)
          localStorage.setItem('username', username)
          return { success: true, message: '注册成功' }
        } 
      } catch (error) {
        return { success: false, message: error.message || '注册失败' }
      }
    }
  }
})

