<template>
  <div class="flex flex-col">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">注册</span>
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
            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">注册</h2>
            <form @submit.prevent="handleRegister">
              <div class="mb-4">
                <input type="text" id="username" v-model="username" class="input-modern" placeholder="请输入用户名" required />
              </div>
              <div class="mb-4">
                <input type="email" id="email" v-model="email" class="input-modern" placeholder="请输入邮箱" required />
              </div>
              <div class="mb-4 flex items-center">
                <input type="text" id="verificationCode" v-model="verificationCode" @input="handleCodeInput" class="input-modern w-2/3" placeholder="请输入验证码" required />
                <button type="button" class="btn-text-white ml-2 mt-2 w-1/3 py-3" @click="sendVerificationCode" :disabled="codeCountDown > 0">
                  {{ codeCountDown > 0 ? `${codeCountDown}秒` : '发送验证码' }}
                </button>
              </div>
              <div class="mb-6">
                <input type="password" id="password" v-model="password" class="input-modern" placeholder="请输入密码" required />
              </div>
              <button type="submit" class="btn-text-white w-full">
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
import ToastMessage from '@/components/ToastMessage.vue'

const authStore = useAuthStore()
const router = useRouter()

const username = ref('')
const email = ref('')
const verificationCode = ref('')
const password = ref('')
const codeCountDown = ref(0)
const toastRef = ref(null)
let countDownTimer = null

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@!#$%^&*()_\-+=\\\/]{6,1007}$/
const usernameRegex = /^.{1,17}$/

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
  const res = await authStore.sendCode(email.value)
  if (res.success) {
    showToast('验证码发送成功', 'success')
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

const handleRegister = async () => {
  const errs = []
  if (!usernameRegex.test(username.value)) {
    errs.push('非法的用户名，用户名为 1~17 位任意字符')
  }
  if (!emailRegex.test(email.value)) {
    errs.push('非法的邮箱格式，请输入合法的邮箱格式')
  }
  if (!/^\d{6}$/.test(verificationCode.value.trim())) {
    errs.push('非法的验证码，验证码为6位数字')
  }
  if (!passwordRegex.test(password.value)) {
    errs.push('非法的密码，密码的长度为 6 到 1007 位，必须包含至少一个英文字符和一个数字，可以选择性的包含 @!#$%^&*()_-+=\\/ 等特殊字符')
  }
  if (errs.length) {
    showToast(errs.join('\n'))
    return
  }

  const res = await authStore.register({
    email: email.value,
    username: username.value,
    password: password.value,
    code: verificationCode.value
  })
  if (res.success) {
    showToast('注册成功', 'success')
    router.push('/login')
  } else {
    showToast(res.message || '注册失败', 'error')
  }
}

onUnmounted(() => {
  if (countDownTimer) clearInterval(countDownTimer)
})
</script>
