<template>
  <div class="flex flex-col">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">忘记密码</span>
        </nav>
      </div>
    </section>
    <section>
      <div class="container mx-auto px-8">
        <div class="min-h-[700px] flex items-center justify-center">
          <div class="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
            <transition name="fade">
              <div
                v-if="toast.show"
                class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white shadow-md rounded-lg px-4 py-3 flex items-start space-x-3 border text-black w-full max-w-md"
              >
                <span class="text-lg text-red-600">✕</span>
                <p class="text-1xl leading-5 whitespace-pre-line">{{ toast.message }}</p>
              </div>
            </transition>
            <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{{ errorMessage }}</div>
            <div v-if="successMessage" class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{{ successMessage }}</div>
            <div class="flex justify-center mb-4">
              <router-link to="/" class="flex items-center space-x-2 text-blue-600">
                <span class="text-xl font-semibold">3D Model Website</span>
              </router-link>
            </div>

            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">忘记密码</h2>
            <form @submit.prevent="handleForgetPassword">
              <div class="mb-4">
                <input type="email" id="email" v-model="email" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入绑定邮箱" required />
              </div>

              <div class="mb-4 flex items-center">
                <input type="text" id="verificationCode" v-model="verificationCode" @input="handleCodeInput" class="w-2/3 p-3 border rounded-lg focus:outline-none" placeholder="请输入验证码" required />
                <button type="button" class="ml-2 text-white bg-blue-600 rounded-lg px-4 py-2" @click="sendVerificationCode" :disabled="codeCountDown > 0">
                  {{ codeCountDown > 0 ? `${codeCountDown}秒` : '发送验证码' }}
                </button>
              </div>

              <div class="mb-6">
                <input type="password" id="newPassword" v-model="newPassword" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入新密码" required />
              </div>

              <div class="mb-6">
                <input type="password" id="confirmPassword" v-model="confirmPassword" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请确认密码" required />
              </div>
              <button type="submit" class="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                重置密码
              </button>
            </form>
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

const email = ref('')
const verificationCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const codeCountDown = ref(0)
let countDownTimer = null

const toast = ref({ show: false, message: '' })
let toastTimer = null
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@!#$%^&*()_\-+=\\/]{6,1007}$/

const showToast = (msg) => {
  toast.value = { show: true, message: msg }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 5000)
}

const handleCodeInput = (e) => {
  const value = e.target.value.replace(/\D/g, '')
  verificationCode.value = value
}

const sendVerificationCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  const errs = []
  if (!email.value || !emailRegex.test(email.value)) {
    errs.push('请输入合法的邮箱格式')
  }
  if (errs.length) {
    showToast(errs.join('\n'))
    return
  }
  if (codeCountDown.value > 0) return
  const res = await authStore.forgot(email.value)
  if (res.success) {
    successMessage.value = '验证码发送成功，请查收邮箱'
    codeCountDown.value = 60
    countDownTimer = setInterval(() => {
      codeCountDown.value--
      if (codeCountDown.value <= 0 && countDownTimer) {
        clearInterval(countDownTimer)
      }
    }, 1000)
  } else {
    errorMessage.value = res.message
  }
}

const handleForgetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  const errs = []
  const codeVal = verificationCode.value.trim()
  if (!emailRegex.test(email.value)) errs.push('请输入合法的邮箱格式')
  if (!/^\d{6}$/.test(codeVal)) errs.push('验证码为6 位数字')
  if (!passwordRegex.test(newPassword.value)) errs.push('非法的密码格式，密码的长度为 6 到 1007 位，必须包含至少一个英文字符和一个数字，可以选择性的包含 @!#$%^&*()_-+=\\/ 等特殊字符')
  if (newPassword.value !== confirmPassword.value) errs.push('两次输入的密码不一致')
  if (errs.length) {
    showToast(errs.join('\n'))
    return
  }

  const res = await authStore.resetPassword(email.value, newPassword.value)
  if (res.success) {
    successMessage.value = '密码重置成功'
    router.push('/login')
  } else {
    errorMessage.value = res.message
  }
}

onUnmounted(() => {
  if (countDownTimer) {
    clearInterval(countDownTimer)
  }
  if (toastTimer) clearTimeout(toastTimer)
})
</script>
