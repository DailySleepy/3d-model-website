<template>
  <div class="flex flex-col">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">登录</span>
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
            <h2 class="text-2xl sm:text-3xl font-bold text-center mb-6">登录</h2>
            <form @submit.prevent="handleLogin">
              <div class="mb-4">
                <input
                  type="text"
                  id="identifier"
                  v-model="identifier"
                  class="input-modern"
                  placeholder="请输入用户名或邮箱"
                  required
                />
              </div>
              <div class="mb-6">
                <input
                  type="password"
                  id="password"
                  v-model="password"
                  class="input-modern"
                  placeholder="请输入密码"
                  required
                />
              </div>
              <div class="flex items-center justify-between mb-4">
                <label class="inline-flex items-center text-sm">
                  <input type="checkbox" v-model="rememberMe" class="form-checkbox text-blue-600" />
                  <span class="ml-2">记住密码</span>
                </label>
                <router-link to="/forget" class="text-sm text-blue-600">忘记密码</router-link>
              </div>
              <button type="submit" class="btn-text-white w-full">
                登录
              </button>
            </form>
            <div class="mt-4 text-center">
              <span class="text-sm text-gray-600">没有账户？</span>
              <router-link to="/register" class="text-sm text-blue-600">注册账户</router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ToastMessage from '@/components/ToastMessage.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const identifier = ref('')
const password = ref('')
const rememberMe = ref(false)
const toastRef = ref(null)

const showToast = (msg, type = 'error') => {
  if (toastRef.value) {
    toastRef.value.show(msg, type, 5000)
  }
}

const handleLogin = async () => {
  const errs = []
  if (!identifier.value) errs.push('请输入用户名或邮箱')
  if (!password.value) errs.push('请输入密码')
  if (errs.length) {
    showToast(errs.join('\n'))
    return
  }
  const res = await authStore.login(identifier.value, password.value)
  if (res.success) {
    if (rememberMe.value) {
      localStorage.setItem('remember_identifier', identifier.value)
    } else {
      localStorage.removeItem('remember_identifier')
    }
    showToast('登录成功', 'success')
    const redirectPath = route.query.redirect || '/'
    router.push(redirectPath)
  } else {
    showToast('账号或密码错误', 'error')
  }
}


</script>
