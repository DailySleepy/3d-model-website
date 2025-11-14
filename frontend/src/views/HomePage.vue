<template>
  <div class="flex flex-col min-h-screen">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <!-- 轮播区 -->
        <ImageCarousel/>
      </div>
    </section>
    <!-- 推荐创作者 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
       <h2 class="text-2xl font-semibold mb-4">推荐创作者</h2>
      </div>
      <!-- TODO: UserCard.vue -->
    </section>

    <!-- 推荐模型 -->
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <h2 class="text-2xl font-semibold mb-4">推荐模型</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ModelCard
            v-for="model in recommendedModels"
            :key="model.id"
            :model="model"
            @click="goToDetail(model.id)"
          />
        </div>
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
