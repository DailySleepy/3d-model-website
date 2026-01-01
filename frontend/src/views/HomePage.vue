<template>
  <div class="flex flex-col min-h-screen">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <!-- 轮播图 -->
        <ImageCarousel />
      </div>
    </section>
    <!-- 最新注册用户 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <h2 class="text-2xl font-semibold mb-4">最新注册的用户</h2>
        <div class="flex flex-nowrap overflow-hidden -mx-2">
          <UserCard v-for="user in recommendedUsers" :key="user.id" :user="user"
            class="flex-none w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-2" />
        </div>
      </div>
    </section>

    <!-- 最新作品 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <h2 class="text-2xl font-semibold mb-4">最新发布的作品</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ModelCard v-for="model in recommendedModels" :key="model.id" :model="model" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
// import { useRouter } from 'vue-router'
import ImageCarousel from '@/components/ImageCarousel.vue';
import ModelCard from '@/components/ModelCard.vue';
import UserCard from '@/components/UserCard.vue';
import { useModelsStore } from '@/stores/models';

// const router = useRouter()
const modelsStore = useModelsStore()
const recommendedModels = ref([])
const recommendedUsers = ref([])

const backendBase = import.meta.env.VITE_API_BASE_URL

const buildUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
}

const loadLatestModels = async () => {
  try {
    const list = await modelsStore.fetchLatestModels(20)
    recommendedModels.value = list.map(m => ({
      ...m,
      thumbnailUrl: buildUrl(m.thumbnailUrl),
      fileUrl: buildUrl(m.fileUrl),
      previewUrls: (m.previewUrls || []).map(buildUrl),
      author: m.author ? {
        ...m.author,
        avatarUrl: buildUrl(m.author.avatar)
      } : null
    }))
  } catch (err) {
    console.error('failed to load latest models', err)
    recommendedModels.value = []
  }
}

const loadLatestUsers = async () => {
  try {
    const list = await modelsStore.fetchLatestUsers(5)
    recommendedUsers.value = list.map(u => ({
      ...u,
      avatarUrl: buildUrl(u.avatar),
      bio: u.bio || ''
    }))
  } catch (err) {
    console.error('failed to load latest users', err)
    recommendedUsers.value = []
  }
}

onMounted(async () => {
  await Promise.all([
    loadLatestModels(),
    loadLatestUsers(),
  ])
})
</script>
