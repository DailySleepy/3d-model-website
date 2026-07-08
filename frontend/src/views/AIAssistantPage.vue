<template>
  <div class="min-h-[calc(100vh-84px)] bg-gradient-to-br from-sky-50 via-white to-blue-50">
    <main class="mx-auto grid h-[calc(100vh-84px)] max-w-6xl grid-cols-[220px_minmax(0,1fr)] gap-5 px-8 py-5">
      <aside class="hidden min-h-0 rounded-lg border border-blue-100/70 bg-white/85 shadow-sm shadow-blue-100/50 backdrop-blur md:block">
        <div class="border-b border-gray-100 px-4 py-4">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-gray-900">引用模型</p>
            <span class="text-xs text-gray-400">{{ latestReferences.length }}</span>
          </div>
        </div>

        <div class="h-[calc(100%-53px)] overflow-y-auto p-4">
          <section v-if="latestReferences.length === 0" class="rounded-lg border border-blue-100 bg-blue-50/70 p-4 text-center">
            <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-500">
              3D
            </div>
            <p class="text-sm font-semibold text-gray-800">暂无引用</p>
            <p class="mt-2 text-xs leading-5 text-gray-500">AI 回答后，相关模型会显示在这里。</p>
          </section>

          <div v-else class="space-y-3">
            <button
              v-for="reference in latestReferences"
              :key="reference.model_id"
              type="button"
              class="group w-full rounded-lg border border-blue-100 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              @click="openModel(reference.model_id)"
            >
              <div class="aspect-video overflow-hidden rounded-md bg-blue-50">
                <img
                  v-if="reference.thumbnail_url"
                  :src="buildAssetUrl(reference.thumbnail_url)"
                  alt="模型缩略图"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-blue-300">3D</div>
              </div>
              <p class="mt-2 truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                {{ reference.title || `模型 ${reference.model_id}` }}
              </p>
              <p class="mt-1 text-xs text-blue-600">匹配度 {{ formatScore(reference.score) }}</p>
              <p v-if="reference.reason" class="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                {{ reference.reason }}
              </p>
            </button>
          </div>
        </div>
      </aside>

      <section class="min-h-0 overflow-hidden rounded-lg border border-blue-100/70 bg-white/90 shadow-sm shadow-blue-100/50 backdrop-blur">
        <header class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">助手</p>
              <h1 class="text-base font-semibold text-gray-900">ModelCraft AI</h1>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <label class="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 sm:flex">
              <span>返回</span>
              <select
                v-model.number="topK"
                class="bg-transparent text-xs font-medium text-gray-800 outline-none"
              >
                <option :value="3">3 个</option>
                <option :value="5">5 个</option>
                <option :value="8">8 个</option>
                <option :value="10">10 个</option>
              </select>
            </label>
            <button
              type="button"
              class="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isLoading || messages.length <= 1"
              @click="resetConversation"
            >
              清空
            </button>
          </div>
        </header>

        <div class="flex h-[calc(100%-73px)] flex-col bg-gray-50/55">
          <div ref="messageListRef" class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div class="min-h-full rounded-lg bg-white/55 p-4">
              <div class="space-y-5">
                <article
                  v-for="message in messages"
                  :key="message.id"
                  :class="['flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start']"
                >
                  <div v-if="message.role !== 'user'" class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                    AI
                  </div>

                  <div :class="['max-w-[78%]', message.role === 'user' ? 'order-first' : '']">
                    <div
                      :class="[
                        'rounded-lg px-4 py-3 text-sm leading-6 shadow-sm',
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-100 bg-white text-gray-800'
                      ]"
                    >
                      <div v-if="message.role !== 'user'" class="mb-1 text-xs text-gray-400">
                        ModelCraft AI · {{ message.time }}
                      </div>
                      <p class="whitespace-pre-wrap">{{ message.content }}</p>
                    </div>

                    <div v-if="message.references?.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        v-for="reference in message.references"
                        :key="reference.model_id"
                        type="button"
                        class="group flex min-w-0 gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        @click="openModel(reference.model_id)"
                      >
                        <div class="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white">
                          <img
                            v-if="reference.thumbnail_url"
                            :src="buildAssetUrl(reference.thumbnail_url)"
                            alt="模型缩略图"
                            class="h-full w-full object-cover"
                          >
                          <div v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-blue-300">3D</div>
                        </div>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700">
                            {{ reference.title || `模型 ${reference.model_id}` }}
                          </p>
                          <p class="mt-1 text-xs text-blue-600">匹配度 {{ formatScore(reference.score) }}</p>
                          <p v-if="reference.reason" class="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                            {{ reference.reason }}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </article>

                <div v-if="isLoading" class="flex items-center gap-3 text-xs text-gray-400">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
                  AI 正在检索站内资源并组织回答...
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 bg-white px-5 py-4">
            <div v-if="errorMessage" class="mb-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              {{ errorMessage }}
            </div>

            <div class="mb-3 sm:hidden">
              <select
                v-model.number="topK"
                class="h-9 rounded-full border border-gray-200 bg-gray-50 px-4 text-xs text-gray-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              >
                <option :value="3">3 个</option>
                <option :value="5">5 个</option>
                <option :value="8">8 个</option>
                <option :value="10">10 个</option>
              </select>
            </div>

            <form class="relative min-h-[48px]" @submit.prevent="sendQuestion">
              <textarea
                v-model="question"
                rows="1"
                class="input-modern mt-0 h-12 min-h-12 w-full resize-none overflow-hidden rounded-full border border-white/60 bg-white/90 py-3 pl-5 pr-14 text-sm leading-6 text-gray-800 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-300 focus:ring-blue-500/20"
                placeholder="输入问题，Shift + Enter 换行..."
                @keydown.enter.exact.prevent="sendQuestion"
              ></textarea>
              <button
                type="submit"
                class="absolute right-2 top-6 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                :disabled="isLoading || !question.trim()"
                title="发送"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { aiAssistantApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const STORAGE_KEY = 'modelcraft_ai_assistant_session'

const question = ref('')
const topK = ref(5)
const isLoading = ref(false)
const errorMessage = ref('')
const messageListRef = ref(null)
const latestReferences = ref([])

const nowTime = () => {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const createWelcomeMessage = () => {
  return {
    id: Date.now(),
    role: 'assistant',
    time: nowTime(),
    content: '欢迎来到 ModelCraft，我能帮助你找到站内合适的模型资源。'
  }
}

const messages = ref([createWelcomeMessage()])

const sendQuestion = async () => {
  const text = question.value.trim()
  if (!text || isLoading.value) return

  errorMessage.value = ''
  messages.value.push({
    id: Date.now(),
    role: 'user',
    time: nowTime(),
    content: text
  })
  question.value = ''
  await scrollToBottom()

  const payload = {
    user_id: authStore.userId,
    question: text,
    top_k: topK.value
  }

  isLoading.value = true
  try {
    const res = await aiAssistantApi.chat(payload)
    const data = res.data || {}
    const references = data.references || []
    latestReferences.value = references
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      time: nowTime(),
      content: data.answer || '未收到有效回答。',
      references
    })
  } catch (error) {
    const detail = error?.response?.data?.detail
    errorMessage.value = detail || error?.message || 'AI 助手请求失败，请检查 llm_backend 是否已启动。'
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      time: nowTime(),
      content: '请求失败，暂时无法完成回答。'
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
  }
}

const resetConversation = () => {
  messages.value = [createWelcomeMessage()]
  errorMessage.value = ''
  latestReferences.value = []
  localStorage.removeItem(STORAGE_KEY)
}

const openModel = (modelId) => {
  router.push(`/model/${modelId}`)
}

const formatScore = (score) => {
  const value = Number(score)
  if (Number.isNaN(value)) return '--'
  return `${Math.round(value * 100)}%`
}

const buildAssetUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('blob:')) return url
  return url
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const restoreSession = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const saved = JSON.parse(raw)
    if (Array.isArray(saved.messages) && saved.messages.length > 0) {
      messages.value = saved.messages
    }
    if (Array.isArray(saved.latestReferences)) {
      latestReferences.value = saved.latestReferences
    }
    if ([3, 5, 8, 10].includes(Number(saved.topK))) {
      topK.value = Number(saved.topK)
    }
    await scrollToBottom()
  } catch (error) {
    console.warn('AI 助手会话恢复失败', error)
    localStorage.removeItem(STORAGE_KEY)
  }
}

const persistSession = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: messages.value,
        latestReferences: latestReferences.value,
        topK: topK.value
      })
    )
  } catch (error) {
    console.warn('AI 助手会话保存失败', error)
  }
}

onMounted(() => {
  restoreSession()
})

watch([messages, latestReferences, topK], persistSession, { deep: true })
</script>
