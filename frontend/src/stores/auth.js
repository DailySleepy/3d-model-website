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
        // API错误统一格式：验证码发送失败，原因：#########
        // error.originalMessage: 来自API响应的错误消息（如"手机号已注册"、"验证码错误"等）
        const reason = error.originalMessage || '请稍后重试'
        const errorMessage = `验证码发送失败，原因：${reason}`
        console.error(errorMessage)
        return {
          success: false,
          message: errorMessage
        }
      }
    },

    async registerAccount(username, phone, password, verificationCode ) {
      try {
        const result = await AuthApi.verifyCode(phone, password, verificationCode)
          return {
            success: true,
            message: result.msg || result.message || '注册成功，请登录',
          }
      } catch (error) {
        // API错误统一格式：注册失败，原因：#########
        // error.originalMessage: 来自API响应的错误消息（如"用户名已存在"、"手机号已注册"、"验证码错误"等）
        const reason = error.originalMessage || '请稍后重试'
        const errorMessage = `注册失败，原因：${reason}`
        console.error(errorMessage)
        return {
          success: false,
          message: errorMessage
        }
      }
    }
  }
})

