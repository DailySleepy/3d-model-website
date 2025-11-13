<template>
<div class="flex justify-center min-h-screen p-4">
  <div class="flex w-full max-w-[1600px] min-w-[1000px]">
    <div class="flex-1">
      <!-- 预览/3D模型渲染 -->
      <div class="relative">
        <button @click="toggleRender" class="absolute top-2 left-2 bg-blue-500 text-white px-4 py-2 rounded">
          {{ isRendering ? '停止渲染' : '播放3D' }}
        </button>
        <ModelViewer v-if="isRendering" :model-url="model.fileUrl" class=" w-full aspect-[16/9]" />
        <img v-else :src="model.thumbnailUrl" alt="thumbnail" class="w-full aspect-[16/9] object-cover" />
      </div>

      <!-- 模型互动按钮 -->
      <div class="mt-4 bg-white p-4 rounded shadow flex gap-2">
        <button>点赞 ({{ model.likeCount }})</button>
        <button>收藏 ({{ model.collectCount }})</button>
        <button v-if="isLoggedIn" class="bg-blue-500 text-white px-4 py-2 rounded">下载</button>
      </div>

      <!-- 评论区 -->
      <div class="mt-4 bg-white p-4 rounded shadow">
        <h2 class="font-semibold mb-2">评论</h2>
        <div v-for="comment in model.comments || []" :key="comment.id" class="mb-2">
          <p class="font-medium">{{ comment.user }}</p>
          <p>{{ comment.content }}</p>
        </div>
      </div>
    </div>

    <div class="w-[250px] ml-4 flex flex-col gap-4">
      <!-- 作者信息 -->
      <div class="bg-white p-4 rounded shadow flex items-center gap-4">
        <img :src="model.author.avatarUrl" class="w-16 h-16 rounded-full" />
        <div>
          <p class="font-medium">{{ model.author.username }}</p>
          <button class="bg-green-500 text-white px-4 py-2 rounded mt-1">关注</button>
        </div>
      </div>

      <!-- 作者其他作品 -->
      <div class="bg-white p-4 rounded shadow">
        <h3 class="font-semibold mb-2">作者的其他作品</h3>
        <div class="grid grid-cols-1 gap-2">
          <div v-for="other in model.author.otherModels || []" :key="other.id">
            <img :src="other.thumbnailUrl" class="w-full h-[100px] object-cover rounded" />
            <p class="text-sm">{{ other.title }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router' // TODO: useRouter 用于跳转到用户界面
import { useModelsStore } from '@/stores/models'
import ModelViewer from '@/components/ModelViewer.vue'

import { mockModels } from '@/mock/model.js' // MOCK

const route = useRoute()
const modelsStore = useModelsStore()
const model = ref({
  previewUrls: [],
  fileUrl: '',
  thumbnailUrl: '',
  title: '',
  description: '',
  author: { username: '', avatarUrl: '' },
  likeCount: 0,
  collectCount: 0
})

const isRendering = ref(false)
const isLoggedIn = ref(false) // TODO: 从auth store获取

onMounted(async () => {
  const id = route.params.id
  //model.value = await modelsStore.fetchModelById(id)
  model.value = mockModels[0];
})

const toggleRender = () => {
  isRendering.value = !isRendering.value
}
</script>
