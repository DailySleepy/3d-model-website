<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <section>
      <div class="container mx-auto px-12 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">账号设置</span>
        </nav>
      </div>
    </section>
    <section>
        <div class="container mx-auto px-12 py-4 max-w-6xl">
            <!-- 标题区域 -->
            <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">账户设置</h1>
            <p class="text-gray-600">您可以在此处设置您的账户信息</p>
            </div>
            <!--以下为分别设计的卡片区域-->
            <div class="space-y-6">
                <!-- 头像设置卡片 -->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">头像设置</h2>
                    <p>这是头像设置</p>
                    <p class="mb-2">你可以点击头像以上传头像</p>
                    <div class="flex items-center gap-4">
                        <div class="flex-1">
                            <p class="text-gray-600">头像不是必须的，但我们推荐你上传自己的头像</p>
                        </div>
                        <label class="cursor-pointer">
                            <input
                            type="file"
                            ref="avatarInput"
                            @change="handleAvatarChange"
                            accept="image/*"
                            class="hidden"
                            />
                            <div class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold hover:bg-blue-600 transition-colors">
                                <span v-if="!avatarPreview">{{ avatarInitial }}</span>
                                <img
                                    v-else
                                    :src="avatarPreview"
                                    alt="Avatar"
                                    class="w-full h-full rounded-full object-cover"
                                />
                            </div>
                        </label>           
                    </div>
                </div>
                <!-- 用户名设置卡片 逻辑未实现-->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">用户名设置</h2>
                    <p>这是用户名设置</p>
                    <p class="mb-2">你的用户名必须唯一</p>
                        <div class="space-y-3">
                            <input
                                v-model="username"
                                type="text"
                                placeholder="用户名"
                                maxlength="17"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div class="flex items-center justify-between">
                                <p class="text-xs text-gray-500">
                                    用户名长度最大为17,字符要求：汉字、字母、数字、下划线
                                </p>
                                <button
                                    @click="saveUsername"
                                    :disabled="savingUsername || username === originalUsername"
                                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                    保存    
                                </button>
                            </div>
                        </div>         
                </div>   
                <!-- 电话设置卡片 逻辑未实现-->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">电话设置</h2>
                    <p>这是电话设置</p>
                    <p class="mb-2">你的电话必须唯一</p>
                        <div class="space-y-3">
                            <input
                                v-model="phone"
                                type="text"
                                placeholder="电话"
                                maxlength="11"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                                v-model="code"
                                type="text"
                                placeholder="验证码"
                                maxlength="6"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div class="flex items-center justify-between">
                                <p class="text-xs text-gray-500">
                                    如果未收到验证码, 请检查您的电话是否正确
                                </p>
                                <button
                                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                    保存 
                                </button>
                            </div>
                        </div>         
                </div>  
                <!-- 密码设置卡片 逻辑未实现-->
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">密码设置</h2>
                    <p>这是密码设置</p>
                    <p class="mb-2">你需要输入旧密码以更改新密码</p>
                        <div class="space-y-3">
                            <input
                                v-model="formerPassword"
                                type="text"
                                placeholder="旧密码"
                                maxlength="17"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                                v-model="newPassword"
                                type="text"
                                placeholder="新密码"
                                maxlength="17"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div class="flex items-center justify-between">
                                <p class="text-xs text-gray-500">
                                    密码最长17位，可以选择性的包含 @!#$%^&*()_-+=\/ 等特殊字符, 至少包含数字和英语字母
                                </p>
                                <button
                                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                    保存 
                                </button>
                            </div>
                        </div>         
                </div>  
            </div>
        </div>
        
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

// 检查登录状态
onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
  }
})

// 头像相关
const avatarInput = ref(null)
const avatarPreview = ref(authStore.avatarUrl && authStore.avatarUrl !== 'https://i.pravatar.cc/150' ? authStore.avatarUrl : null)
const avatarInitial = computed(() => {
  const username = authStore.username || ''
  return username.charAt(0).toUpperCase() || 'U'
})

// 用户名相关
const username = ref(authStore.username || '')
const originalUsername = ref(authStore.username || '')
const savingUsername = ref(false)
</script>





















