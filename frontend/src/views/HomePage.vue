<template>
  <div class="flex flex-col min-h-screen">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <!-- 轮播区 -->
        <ImageCarousel />
      </div>
    </section>
    <!-- TODO 添加"换一批"按钮 -->
    <!-- 推荐创作者 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <h2 class="text-2xl font-semibold mb-4">推荐创作者</h2>
        <div class="flex flex-nowrap overflow-hidden -mx-2">
          <UserCard v-for="user in recommendedUsers" :key="user.id" :user="user" layout="vertical"
            class="flex-none w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-2" />
        </div>
      </div>
    </section>

    <!-- 推荐模型 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <h2 class="text-2xl font-semibold mb-4">推荐模型</h2>
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

import { mockModels } from '@/mock/model.js'; // MOCK
import { mockUsers } from '@/mock/user.js';
onMounted(async () => {
  // recommendedModels.value = await modelsStore.fetchRecommendedModels()
  // recommendedUsers.value = await modelsStore.fetchRecommendedUsers()
  modelsStore
  recommendedModels.value = mockModels // TODO
  recommendedUsers.value = mockUsers // TODO
})
</script>
