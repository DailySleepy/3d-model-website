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
            <ToastMessage ref="toastRef" />
            <div class="flex justify-center mb-4">
              <router-link to="/" class="flex items-center space-x-2 text-blue-600">
                <span class="text-xl font-semibold">ModelCraft</span>
              </router-link>
            </div>

            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">忘记密码</h2>
            <form @submit.prevent="handleForgetPassword">
              <div class="mb-4">
                <input type="email" id="email" v-model="email" class="input-modern" placeholder="请输入绑定邮箱" required />
              </div>

              <div class="mb-4 flex items-center">
                <input type="text" id="verificationCode" v-model="verificationCode" @input="handleCodeInput" class="input-modern w-2/3" placeholder="请输入验证码" required />
                <button type="button" class="btn-text-white ml-2 mt-2 w-1/3 py-3" @click="sendVerificationCode" :disabled="codeCountDown > 0">
                  {{ codeCountDown > 0 ? `${codeCountDown}秒` : '发送验证码' }}
                </button>
              </div>

              <div class="mb-6">
                <input type="password" id="newPassword" v-model="newPassword" class="input-modern" placeholder="请输入新密码" required />
              </div>

              <div class="mb-6">
                <input type="password" id="confirmPassword" v-model="confirmPassword" class="input-modern" placeholder="请确认密码" required />
              </div>
              <button type="submit" class="btn-text-white w-full">
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
import ToastMessage from '@/components/ToastMessage.vue'

const authStore = useAuthStore()
const router = useRouter()

const email = ref('')
const verificationCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const codeCountDown = ref(0)
let countDownTimer = null

const toastRef = ref(null)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@!#$%^&*()_\-+=\\/]{6,1007}$/

const showToast = (msg, type = 'error') => {
  if (toastRef.value) {
    toastRef.value.show(msg, type, 5000)
  }
}

const handleCodeInput = (e) => {
  const value = e.target.value.replace(/\D/g, '')
  verificationCode.value = value
}

const sendVerificationCode = async () => {
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
    showToast('验证码发送成功，请查收邮箱', 'success')
    codeCountDown.value = 60
    countDownTimer = setInterval(() => {
      codeCountDown.value--
      if (codeCountDown.value <= 0 && countDownTimer) {
        clearInterval(countDownTimer)
      }
    }, 1000)
  } else {
    showToast(res.message || '发送失败', 'error')
  }
}

const handleForgetPassword = async () => {
  const errs = []
  const codeVal = verificationCode.value.trim()
  if (!emailRegex.test(email.value)) errs.push('请输入合法的邮箱格式')
  if (!/^\d{6}$/.test(codeVal)) errs.push('验证码为6位数字')
  if (!passwordRegex.test(newPassword.value)) errs.push('非法的密码格式，密码的长度为 6 到 1007 位，必须包含至少一个英文字符和一个数字，可以选择性的包含 @!#$%^&*()_-+=\\/ 等特殊字符')
  if (newPassword.value !== confirmPassword.value) errs.push('两次输入的密码不一致')
  if (errs.length) {
    showToast(errs.join('\n'))
    return
  }
  const res = await authStore.resetPassword(email.value, newPassword.value)
  if (res.success) {
    showToast('密码重置成功', 'success')
    router.push('/login')
  } else {
    showToast(res.message || '重置失败', 'error')
  }
}

onUnmounted(() => {
  if (countDownTimer) {
    clearInterval(countDownTimer)
  }
})
</script>
