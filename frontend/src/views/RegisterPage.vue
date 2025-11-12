<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <section>
      <nav class="text-1xl text-gray-600">
        <router-link to="/" class="hover:underline">主页</router-link>
        <span class="mx-2">></span>
        <span class="text-gray-900">注册</span>
      </nav>
    </section>
    <section>
      <div class="container mx-auto px-4">
        <div class="min-h-[70vh] flex items-center justify-center">
          <div class="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
            <!--提示信息-->
            <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{{ errorMessage }}</div>
            <div v-if="successMessage" class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{{ successMessage }}</div>
            <!-- Logo部分 -->
            <div class="flex justify-center mb-4">
              <router-link to="/" class="flex items-center space-x-2 text-blue-600">
              <span class="text-xl font-semibold">3D Model Website</span>
              </router-link>
            </div>

            <!-- 表单部分 -->
            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">注册</h2>
            <form @submit.prevent="handleRegister">
              <!-- 用户名输入框 -->
              <div class="mb-4">
                <input type="text" id="username" v-model="username" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入用户名" required />
              </div>

              <!-- 电话输入框 -->
              <div class="mb-4">
                <input type="tel" id="phone" v-model="phone" @input="handlePhoneInput" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入电话" required />
              </div>

              <!-- 验证码输入框 -->
              <div class="mb-4 flex items-center">
                <input type="text" id="verificationCode" v-model="verificationCode" @input="handleCodeInput" class="w-2/3 p-3 border rounded-lg focus:outline-none" placeholder="请输入验证码" required />
                <button type="button" class="ml-2 text-white bg-blue-600 rounded-lg px-4 py-2" @click="sendVerificationCode" :disabled="codeCountDown > 0">
                {{ codeCountDown > 0 ? `${codeCountDown}秒` : '发送验证码' }}</button>
              </div>

              <!-- 密码输入框 -->
              <div class="mb-6">
                <input type="password" id="password" v-model="password" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入密码" required />
              </div>

              <!-- 注册按钮 -->
              <button type="submit" class="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                注册
              </button>
            </form>

            <div class="mt-4 text-center">
              <span class="text-sm text-gray-600">已有账户？</span>
              <router-link to="/login" class="text-sm text-blue-600">登录账户</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const username = ref('')
const phone = ref('')
const verificationCode = ref('')
const password = ref('')
// const agreeTerms = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const codeCountDown = ref('')
let countDownTimer = null

// 手机号格式验证正则
const phoneRegex = /^1[3-9]\d{9}$/

// 手机号输入格式化（只允许数字）
const handlePhoneInput = (e) => {
  const value = e.target.value.replace(/\D/g, '')
  phone.value = value
}

// 验证码输入格式化（只允许数字）
const handleCodeInput = (e) => {
  const value = e.target.value.replace(/\D/g, '')
  verificationCode.value = value
}

const sendVerificationCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''
    // 前端验证：检查手机号
  if (!phone.value) {
    errorMessage.value = '请先输入手机号'
    return
  }

  // 前端验证：手机号格式
  if (!phoneRegex.test(phone.value)) {
    errorMessage.value = '请输入正确的手机号'
    return
  }
  if (codeCountDown.value > 0) return
    const res = await authStore.getVerificationCode(phone.value) 
    if (res.success) {
      successMessage.value = '验证码发送成功'
      codeCountDown.value = 60
      countDownTimer = setInterval(() => {
        codeCountDown.value--
      }, 1000)
    } else {
      errorMessage.value = res.message
    }
}

const handleRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  // 前端验证：输入项
  if (!username.value || !phone.value || !verificationCode.value || !password.value) {
    errorMessage.value = '请填写所有必填项'
    return
  }

  // 前端验证：手机号格式
  if (!phoneRegex.test(phone.value)) {
    errorMessage.value = '请输入正确的手机号'
    return
  }

  // 前端验证：密码长度
  if (password.value.length < 6) {
    errorMessage.value = '密码长度至少6位'
    return
  }

  // 前端验证：验证码格式
  if (!verificationCode.value || verificationCode.value.length !== 4) {
    errorMessage.value = '请输入4位数字'
    return
  }
    const res = await authStore.registerAccount(
      username.value,
      phone.value,
      password.value,
      verificationCode.value
    )
    if (res.success) {
      successMessage.value = '注册成功'
      router.push('/login')
    } else {
      errorMessage.value = res.message
    }
}

</script>

