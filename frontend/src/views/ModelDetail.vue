<template>
  <div class="flex justify-center min-h-screen p-4">
    <div class="flex w-full max-w-[1600px] min-w-[1000px]">

      <div class="flex-1">
        <!-- 模型基础信息 -->
        <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ model.title }}</h1>
        <div class="flex items-center text-sm text-gray-500 mb-4 gap-4">
          <span>分类: {{ model.category || '未分类' }}</span>
          <span>发布于: {{ formatDate(model.createdAt) }}</span>
        </div>

        <!-- 预览/3D模型渲染 -->
        <div class="relative rounded-t-lg border-t border-x border-gray-200 overflow-hidden">
          <button @click="toggleRender"
            class="absolute top-2 left-2 z-10 bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600 transition">
            {{ isRendering ? '停止渲染' : '播放3D' }}
          </button>
          <div class="w-full aspect-[16/9] bg-gray-100">
            <ModelViewer v-if="isRendering" :model-url="model.fileUrl" class="w-full h-full" />
            <img v-else :src="model.thumbnailUrl" alt="thumbnail" class="w-full h-full object-cover" />
          </div>
        </div>

        <!-- 互动按钮 -->
        <div class="flex flex-wrap gap-3 bg-white border-x border-gray-200 border-b p-4">
          <!-- 点赞 -->
          <button @click="handleLike" :class="[
            'flex items-center gap-2 px-6 py-2 rounded-full transition-colors font-medium border',
            model.likedByUser
              ? 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          ]">
            <span class="text-lg">{{ model.likedByUser ? '♥' : '♡' }}</span>
            <span>{{ model.likedByUser ? '已点赞' : '点赞' }}</span>
            <span class="ml-1 bg-white/50 px-2 rounded-full text-xs py-0.5">
              {{ model.likeCount }}
            </span>
          </button>

          <!-- 收藏 -->
          <button @click="handleCollect" :class="[
            'flex items-center gap-2 px-6 py-2 rounded-full transition-colors font-medium border',
            model.collectedByUser
              ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          ]">
            <span class="text-lg">{{ model.collectedByUser ? '★' : '☆' }}</span>
            <span>{{ model.collectedByUser ? '已收藏' : '收藏' }}</span>
            <span class="ml-1 bg-white/50 px-2 rounded-full text-xs py-0.5">
              {{ model.collectCount }}
            </span>
          </button>

          <!-- 下载 -->
          <button @click="handleDownload"
            class="ml-auto bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-400">
            <span>下载模型</span>
          </button>
        </div>

        <!-- 模型简介 -->
        <div class="bg-white p-6 rounded-b-lg shadow-sm border-x border-b border-gray-200">
          <h3 class="font-semibold mb-2 text-gray-900 text-lg">模型简介</h3>
          <div class="text-gray-700 leading-relaxed">
            <p>{{ model.description || '作者很懒，没有留下描述。' }}</p>
          </div>
        </div>

        <!-- 评论区 -->
        <CommentSection :modelId="model.id" />

      </div>

      <!-- TODO -->
      <div class="w-[250px] ml-6 flex flex-col gap-4 flex-shrink-0">
        <!-- 作者信息 -->
        <UserCard :user="model.author" layout="horizontal" :show-action="true" />

        <!-- 作者其他作品 -->
        <div class="bg-white p-4 rounded shadow">
          <h3 class="font-semibold mb-2">作者的其他作品</h3>
          <div class="grid grid-cols-1 gap-3">
            <ModelCard v-for="other in model.author.otherModels || []" :key="other.id" :model="other"
              variant="compact" />
            <div v-if="!model.author.otherModels?.length" class="text-gray-400 text-sm">暂无其他作品</div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import api from '@/api';
import CommentSection from '@/components/CommentSection.vue';
import ModelCard from '@/components/ModelCard.vue';
import ModelViewer from '@/components/ModelViewer.vue';
import UserCard from '@/components/UserCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useModelsStore } from '@/stores/models';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute()
const modelsStore = useModelsStore()
const authStore = useAuthStore()

const isRendering = ref(false)

const model = ref({
  id: '',
  title: 'Loading...',
  description: '',
  category: '',
  tags: [],
  fileUrl: '',
  thumbnailUrl: '',
  createdAt: '',
  likeCount: 0,
  collectCount: 0,
  likedByUser: false,
  collectedByUser: false,
  author: {
    id: 0,
    username: 'Unknown',
    avatarUrl: '',
    bio: '',
    followedByUser: false,
    otherModels: []
  }
})

import { mockModels } from '@/mock/model.js'; // MOCK
const loadModelData = async (id) => {
  try {
    let data = await modelsStore.fetchModelById(id)
    data = mockModels[0] // TODO
    if(Date.now() % 2 == 1) data.fileUrl = '/models/rotating_cube.glb'
    model.value = {
      ...model.value,
      ...data,
      author: data.author || { username: 'Unknown', avatarUrl: '', otherModels: [] }
    }
  } catch (error) {
    console.error('Failed to load model:', error)
  }
}

onMounted(() => {
  if (route.params.id) {
    loadModelData(route.params.id)
  }
})

const toggleRender = () => {
  isRendering.value = !isRendering.value
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

const handleLike = async () => {
  if (!authStore.checkLogin()) return

  const previousState = model.value.likedByUser
  model.value.likedByUser = !previousState
  model.value.likeCount += previousState ? -1 : 1

  try {
    await api.post(`/api/models/${model.value.id}/like`)
  } catch (error) {
    model.value.likedByUser = previousState
    model.value.likeCount += previousState ? 1 : -1
    console.error('Like failed:', error)
  }
}

const handleCollect = async () => {
  if (!authStore.checkLogin()) return

  const previousState = model.value.collectedByUser
  model.value.collectedByUser = !previousState
  model.value.collectCount += previousState ? -1 : 1

  try {
    await api.post(`/api/models/${model.value.id}/collect`)
  } catch (error) {
    model.value.collectedByUser = previousState
    model.value.collectCount += previousState ? 1 : -1
    console.error('Collect failed:', error)
  }
}

const handleDownload = () => {
  if (!authStore.checkLogin()) return
  // TODO
}
</script>
