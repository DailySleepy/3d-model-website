<template>
  <!-- TODO:用户协议的内容 -->
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <!-- 注册表单 -->
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <!--提示信息-->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{{ errorMessage }}</div>
      <div v-if="successMessage" class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{{ successMessage }}</div>
      <!-- Logo部分 -->
      <div class="flex justify-center mb-4">
        <router-link to="/home" class="flex items-center space-x-2 text-blue-600">
          <span class="text-xl font-semibold">3D Model Website</span>
        </router-link>
      </div>

      <!-- 表单部分 -->
      <h2 class="text-2xl font-bold text-center mb-6">注册</h2>
      <form @submit.prevent="handleRegister">
        <!-- 用户名输入框 -->
        <div class="mb-4">
          <input type="text" id="username" v-model="username" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入用户名" required />
        </div>

        <!-- 电话输入框 -->
        <div class="mb-4">
          <input type="tel" id="phone" v-model="phone" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入电话" required />
        </div>

        <!-- 验证码输入框 -->
        <div class="mb-4 flex items-center">
          <input type="text" id="verificationCode" v-model="verificationCode" class="w-2/3 p-3 border rounded-lg focus:outline-none" placeholder="请输入验证码" required />
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
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const username = ref('')
const phone = ref('')
const verificationCode = ref('')
const password = ref('')
// const agreeTerms = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const codeCountDown = ref('')
let countDownTimer = null

const sendVerificationCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  if (codeCountDown.value > 0) return
  try {
    const res = await authStore.getVerificationCode(phone.value) 
    if (res.success) {
      successMessage.value = '验证码发送成功'
      codeCountDown.value = 60
      countDownTimer = setInterval(() => {
        codeCountDown.value--
      }, 1000)
    } 
  } catch (error) {
    errorMessage.value = error.message || '验证码发送失败'
  }
}

const handleRegister = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  if (!username.value || !phone.value || !verificationCode.value || !password.value) {
    errorMessage.value = '请填写完整信息'
    return
  }
  try {
    const res = await authStore.registerAccount(
      username.value,
      phone.value,
      password.value,
      verificationCode.value
    )
    if (res.success) {
      successMessage.value = '注册成功'
      router.push('/')
    } 
  } catch (error) {
    errorMessage.value = error.message || '注册失败'
  }
}

</script>

