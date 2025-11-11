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
    },

    async loginAccount(identifier, password) { 
      try {
        //首先检查identifier是手机号还是用户名
        const isPhone = /^1[3456789]\d{9}$/.test(identifier)  

        const result = await AuthApi.Login(identifier, password)
        if(result.data?.token) {
          this.token = result.data.token
          //这里逻辑先这样写，后续设计接口时需要返回项把用户名和手机号都返回
          this.phone = isPhone ? identifier : (this.phone || '')
          this.username = !isPhone ? identifier : (this.username || '')
          this.isLoggedIn = true
          // 保存到localStorage
          localStorage.setItem('token', result.data.token)
          if (this.phone) localStorage.setItem('phone', this.phone)
          if (this.username) localStorage.setItem('username', this.username)
          return {
            success: true,
            message: result.msg || result.message || '登录成功'
          }
        } 
      } catch (error) {
        // API错误统一格式：登录失败，原因：#########
        // error.originalMessage: 来自API响应的错误消息（如"用户名或密码错误"、"账号已禁用"等）
        const reason = error.originalMessage || '请稍后重试'
        const errorMessage = `登录失败，原因：${reason}`
        console.error(errorMessage)
        return {
          success: false,
          message: errorMessage
        }
      }
    },

    async logoutAccount() {
      this.token = null
      this.user = null
      this.isLoggedIn = false
      this.username = ''
      this.phone = ''
      // 从localStorage移除token和用户名
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('phone')
      // 导航到登录页
      router.push('/')
    }
  }
})

