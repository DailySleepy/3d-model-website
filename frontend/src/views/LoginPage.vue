<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <nav class="absolute top-40 left-40 text-1xl text-gray-600">
      <router-link to="/" class="hover:underline">主页</router-link>
      <span class="mx-2">></span>
      <span class="text-gray-900">登录</span>
    </nav>
    <!-- 登录表单 -->
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
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
      <h2 class="text-3xl font-bold text-center mb-6">登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <input type="text" id="identifier" v-model="identifier" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入用户名或电话" required />
        </div>

        <div class="mb-6">
          <input type="password" id="password" v-model="password" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入密码" required />
        </div>

        <!-- 记住密码 -->
        <div class="flex items-center justify-between mb-4">
          <label class="inline-flex items-center text-sm">
            <input type="checkbox" v-model="rememberMe" class="form-checkbox text-blue-600" />
            <span class="ml-2">记住密码</span>
          </label>
          <router-link to="/forgot-password" class="text-sm text-blue-600">忘记密码</router-link>
        </div>

        <!-- 登录按钮 -->
        <button type="submit" class="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          登录
        </button>
      </form>

      <!-- 注册链接 -->
      <div class="mt-4 text-center">
        <span class="text-sm text-gray-600">没有账户？</span>
        <router-link to="/register" class="text-sm text-blue-600">注册账户</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const identifier = ref('')
const password = ref('')
const rememberMe = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  // 前端验证：输入项
  if (!identifier.value || !password.value) {
    errorMessage.value = '请填写所有必填项'
    return
  }

  const res = await authStore.loginAccount(
    identifier.value,
    password.value,
  )
  if (res.success) {
    successMessage.value = '登录成功'
    router.push('/')
  } else {
    errorMessage.value = res.message
  }
}

</script>

