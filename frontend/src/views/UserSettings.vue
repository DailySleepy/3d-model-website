<template>
  <div class="flex flex-col">
    <ToastMessage ref="toastRef" />

    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">账户设置</span>
        </nav>
      </div>
    </section>

    <section>
      <div class="container mx-auto px-12 py-4 max-w-6xl">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">账户设置</h1>
          <p class="text-gray-600">您可以在此处设置您的账户信息</p>
        </div>

        <div class="space-y-6">
          <!-- 头像设置 -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">头像设置</h2>
            <p>这是头像设置</p>
            <p class="mb-2">你可以点击头像以上传头像</p>
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <p class="text-gray-600">头像不是必须的，但我们强烈推荐上传头像</p>
              </div>
              <label class="cursor-pointer">
                <input type="file" ref="avatarInput" @change="handleAvatarChange" accept="image/*" class="hidden" />
                <div
                  class="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold hover:bg-blue-600 transition-colors"
                  :class="errors.avatar ? 'ring-2 ring-red-400 bg-red-50 text-red-600' : ''"
                >
                  <span v-if="!avatarPreview">{{ avatarInitial }}</span>
                  <img v-else :src="avatarPreview" alt="Avatar" class="w-full h-full rounded-full object-cover" />
                </div>
              </label>
            </div>
            <p v-if="errors.avatar" class="text-xs text-red-500 mt-1">{{ errors.avatar }}</p>
          </div>

          <!-- 用户名设置 -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">用户名设置</h2>
            <p>这是用户名设置</p>
            <p class="mb-2">您的用户名必须唯一</p>
            <div class="space-y-3">
              <input
                v-model="username"
                type="text"
                placeholder="用户名"
                maxlength="17"
                class="input-modern"
                :class="errors.username ? 'border-red-400 bg-red-50 text-red-700' : ''"
              />
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500">
                  用户名长度最大为17, 字符要求：汉字、字母、数字、下划线
                </p>
                <button
                  @click="saveUsername"
                  class="btn-text-white"
                >
                  保存
                </button>
              </div>
              <p v-if="errors.username" class="text-xs text-red-500">{{ errors.username }}</p>
            </div>
          </div>

          <!-- 简介设置 -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">签名</h2>
            <p>这是您的签名设置</p>
            <p class="mb-2">签名最大长度为107, 可以是任意字符</p>
            <div class="space-y-3">
              <textarea
                v-model="bio"
                rows="3"
                placeholder="签名"
                maxlength="107"
                class="input-modern"
                :class="errors.bio ? 'border-red-400 bg-red-50' : ''"
              ></textarea>
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500">
                  您的签名会展示在主页
                </p>
                <button
                  @click="saveBio"
                  class="btn-text-white"
                >
                  保存
                </button>
              </div>
              <p v-if="errors.bio" class="text-xs text-red-500">{{ errors.bio }}</p>
            </div>
          </div>

          <!-- 邮箱设置 -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">邮箱设置</h2>
            <p>这是邮箱设置</p>
            <p class="mb-2">你的邮箱必须唯一</p>
            <div class="space-y-3">
              <input
                v-model="email"
                type="email"
                placeholder="邮箱"
                maxlength="64"
                class="input-modern"
                :class="errors.email ? 'border-red-400 bg-red-50 text-red-700' : ''"
              />
              <div class="flex items-center gap-2">
                <input
                  v-model="emailCode"
                  type="text"
                  placeholder="验证码"
                  maxlength="6"
                  class="input-modern"
                />
                <button
                  @click="sendEmailCode"
                  :disabled="sendEmailCountdown > 0"
                  class="btn-text-white py-3 mt-2"
                >
                  {{ sendEmailCountdown > 0 ? `${sendEmailCountdown}s` : '发送验证码' }}
                </button>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500">
                  如果未收到验证码, 请检查您的邮箱是否正确
                </p>
                <button
                  @click="saveEmail"
                  class="btn-text-white"
                >
                  保存
                </button>
              </div>
              <p v-if="errors.email" class="text-xs text-red-500">{{ errors.email }}</p>
            </div>
          </div>

          <!-- 密码设置 -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">密码设置</h2>
            <p>这是密码设置</p>
            <p class="mb-2">你需要输入旧密码以更改新密码</p>
            <div class="space-y-3">
              <input
                v-model="formerPassword"
                type="password"
                placeholder="旧密码"
                maxlength="50"
                class="input-modern"
              />
              <input
                v-model="newPassword"
                type="password"
                placeholder="新密码"
                maxlength="50"
                class="input-modern"
              />
              <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500">
                  密码至少7位，可以选择性地包含!#$%^&*()_-+=\/ 等特殊字符，至少包含数字和英文字母
                </p>
                <button
                  @click="savePassword"
                  class="btn-text-white"
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
import { userSettingsApi, authApi } from '@/api'
import ToastMessage from '@/components/ToastMessage.vue'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
  }
})

const avatarPreview = ref(authStore.avatar || '')
const avatarInitial = computed(() => {
  const username = authStore.username || ''
  return username.charAt(0).toUpperCase() || 'U'
})

const username = ref('')
const originalUsername = ref('')
const savingUsername = ref(false)

const email = ref('')
const emailCode = ref('')
const sendEmailCountdown = ref(0)
let sendEmailTimer = null
const bio = ref('')

const formerPassword = ref('')
const newPassword = ref('')

const userId = computed(() => authStore.userId)
const toastRef = ref(null)
const errors = ref({ avatar: '', username: '', bio: '', email: '' })

const showToast = (msg, type = 'success') => {
  if (toastRef.value) {
    toastRef.value.show(msg, type, 5000)
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const handleAvatarChange = async (e) => {
  const file = e.target.files?.[0]
  errors.value.avatar = ''
  if (!file) {
    errors.value.avatar = '请选择要上传的头像'
    return
  }
  if (!userId.value) {
    showToast('请先登录后再更新头像', 'error')
    router.push('/login')
    return
  }
  try {
    const uploadResp = await userSettingsApi.uploadAvatar(file)
    const url = uploadResp.data
    await userSettingsApi.updateAvatar(userId.value, url)
    avatarPreview.value = url
    const updated = { ...(authStore.user || {}), avatar: url }
    authStore.setSession(authStore.token, updated)
    showToast('头像已更新', 'success')
  } catch (err) {
    console.error('头像更新失败', err?.response?.data || err)
    errors.value.avatar = err?.response?.data || err?.message || '上传失败'
  }
}

const saveUsername = async () => {
  errors.value.username = ''
  if (!userId.value) {
    showToast('请先登录后再更新用户名', 'error')
    router.push('/login')
    return
  }
  if (!username.value || username.value.trim().length < 1) {
    errors.value.username = '用户名不能为空'
    return
  }
  if (username.value.length > 17) {
    errors.value.username = '用户名长度不能超过17个字符'
    return
  }
  if (username.value === originalUsername.value) return
  savingUsername.value = true
  try {
    await userSettingsApi.updateUsername(userId.value, username.value)
    authStore.user = { ...(authStore.user || {}), username: username.value }
    localStorage.setItem('user', JSON.stringify(authStore.user))
    originalUsername.value = username.value
    showToast('用户名已更新', 'success')
  } catch (err) {
    console.error(err)
    errors.value.username = err?.response?.data || err?.message || '用户名更新失败'
  } finally {
    savingUsername.value = false
  }
}

const saveBio = async () => {
  errors.value.bio = ''
  if (!userId.value) {
    showToast('请先登录后再更新签名', 'error')
    router.push('/login')
    return
  }
  if (!bio.value || bio.value.trim().length < 1) {
    errors.value.bio = '签名不能为空'
    return
  }
  if (bio.value.length > 107) {
    errors.value.bio = '签名长度不能超过107个字符'
    return
  }
  try {
    await userSettingsApi.updateBio(userId.value, bio.value)
    showToast('签名已更新', 'success')
  } catch (err) {
    console.error(err)
    errors.value.bio = err?.response?.data || err?.message || '签名更新失败'
  }
}

const sendEmailCode = async () => {
  errors.value.email = ''
  if (!userId.value) {
    showToast('请先登录后再更新邮箱', 'error')
    router.push('/login')
    return
  }
  if (!email.value || !emailRegex.test(email.value)) {
    errors.value.email = '请输入正确的邮箱'
    return
  }
  if (sendEmailCountdown.value > 0) return
  try {
    await authApi.sendCode(email.value)
    sendEmailCountdown.value = 60
    sendEmailTimer = setInterval(() => {
      sendEmailCountdown.value--
      if (sendEmailCountdown.value <= 0 && sendEmailTimer) {
        clearInterval(sendEmailTimer)
      }
    }, 1000)
    showToast('验证码已发送，请查收邮箱', 'success')
  } catch (err) {
    console.error(err)
    errors.value.email = err?.response?.data || err?.message || '验证码发送失败'
  }
}

const saveEmail = async () => {
  errors.value.email = ''
  if (!userId.value) {
    showToast('请先登录后再更新邮箱', 'error')
    router.push('/login')
    return
  }
  if (!email.value || !emailRegex.test(email.value)) {
    errors.value.email = '请输入正确的邮箱'
    return
  }
  if (!emailCode.value || emailCode.value.length !== 6) {
    errors.value.email = '请输入6位邮箱验证码'
    return
  }
  try {
    await userSettingsApi.updateEmail(userId.value, email.value)
    authStore.user = { ...(authStore.user || {}), email: email.value }
    localStorage.setItem('user', JSON.stringify(authStore.user))
    showToast('邮箱已更新', 'success')
  } catch (err) {
    console.error(err)
    errors.value.email = err?.response?.data || err?.message || '邮箱更新失败'
  }
}

const savePassword = async () => {
  if (!userId.value || !formerPassword.value || !newPassword.value) return
  try {
    await userSettingsApi.changePassword(userId.value, {
      oldPassword: formerPassword.value,
      newPassword: newPassword.value
    })
    formerPassword.value = ''
    newPassword.value = ''
    showToast('密码已更新', 'success')
  } catch (err) {
    console.error(err)
    showToast('密码更新失败，请检查你的旧密码是否正确', 'error')
  }
}
</script>
