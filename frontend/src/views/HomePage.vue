<template>
  <div class="min-h-screen">
    <!-- 轮播区 -->
    <ImageCarousel/>

    <!-- 推荐创作者 -->
    <section class="py-8 px-4">
      <h2 class="text-2xl font-semibold mb-4">推荐创作者</h2>
      <!-- TODO: UserCard.vue -->
    </section>

    <!-- 推荐模型 -->
    <section class="py-8 px-4">
      <h2 class="text-2xl font-semibold mb-4">推荐模型</h2>
      <div class="grid grid-cols-4 gap-4">
        <ModelCard
          v-for="model in recommendedModels"
          :key="model.id"
          :model="model"
          @click="goToDetail(model.id)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useModelsStore } from '@/stores/models'
import ModelCard from '@/components/ModelCard.vue'
import ImageCarousel from '@/components/ImageCarousel.vue'

import { mockModels } from '@/mock/model.js' // MOCK

const router = useRouter()
const modelsStore = useModelsStore()
const recommendedModels = ref([])
// const recommendedUsers = ref([]) // TODO

const goToDetail = (id) => {
  router.push(`/model/${id}`)
}

onMounted(async () => {
  recommendedModels.value = mockModels // MOCK
  modelsStore // remove later
  // recommendedModels.value = await modelsStore.fetchRecommendedModels()
  // recommendedUsers.value = await modelsStore.fetchRecommendedUsers() // TODO
})
</script>
