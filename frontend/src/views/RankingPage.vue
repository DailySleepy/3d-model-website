<template>
  <section>
    <div class="container mx-auto px-8 py-4 max-w-6xl">
      <nav class="text-1xl text-gray-600">
        <router-link to="/" class="hover:underline">主页</router-link>
        <span class="mx-2">></span>
        <span class="text-gray-900">热度排行</span>
      </nav>
    </div>
  </section>
  <div class="container mx-auto px-8 py-4 max-w-6xl">

        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">热度排行</h1>
          <p class="text-gray-600">这里展示了最受欢迎的模型与创作用户</p>
        </div>

    <div class="grid grid-cols-1 lg:grid-cols-2">
      <!-- 模型排行 -->
      <section
        class="lg:border-r lg:border-gray-200 lg:pr-12 pb-12 lg:pb-0 border-b lg:border-b-0 border-gray-200 mb-12 lg:mb-0">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="bg-blue-500 w-2 h-8 rounded-full"></div>
            <h2 class="text-2xl font-bold">模型排行</h2>
          </div>
          <span class="text-xs text-gray-400 uppercase tracking-widest font-bold">Hotness Score</span>
        </div>

        <div class="space-y-4">
          <div v-for="(model, index) in modelRankings" :key="model.id" class="flex items-center gap-4 group">
            <div :class="[
              'w-10 text-2xl font-black italic text-center',
              index < 3 ? 'text-orange-500' : 'text-gray-300'
            ]">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0 transition-transform group-hover:-translate-y-1">
              <ModelCard :model="model" />
            </div>
            <div class="w-20 shrink-0 text-right mr-4 flex flex-col items-end">
              <div class="flex items-center justify-end gap-1 text-orange-600 font-bold text-xl">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19.452 14.93c-.144-3.525-2.344-6.427-4.143-8.497-.333-.382-.924-.131-.904.376.12 3.12-1.921 5.485-3.09 6.643-1.076 1.066-2.14 2.222-2.14 3.922 0 3.25 2.68 5.626 5.825 5.626s5.825-2.376 5.825-5.626c0-.147-.01-.29-.029-.43-.021-.16-.201-.24-.344-.144zM14.003 2c-.172 0-.312.131-.312.292 0 1.954-1.396 3.033-2.603 4.542-.71.888-1.554 1.943-1.554 3.491 0 .848.339 1.62.888 2.193.063.066.166.04.195-.047.387-1.159 1.481-2.072 2.385-2.822 1.139-.945 2.176-1.805 2.176-3.649 0-2.333-1.041-4.001-1.176-4c-.135-.001-.013-1.001-.013-1.001z" />
                </svg>
                {{ calculateModelHeat(model) }}
              </div>
              <span class="text-[10px] text-gray-400 uppercase font-medium">Heat</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 作者排行 -->
      <section class="lg:pl-12">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="bg-purple-500 w-2 h-8 rounded-full"></div>
            <h2 class="text-2xl font-bold">作者排行</h2>
          </div>
          <span class="text-xs text-gray-400 uppercase tracking-widest font-bold">Followers</span>
        </div>

        <div class="space-y-4">
          <div v-for="(user, index) in userRankings" :key="user.id" class="flex items-center gap-4 group">
            <div :class="[
              'w-10 text-2xl font-black italic text-center',
              index < 3 ? 'text-orange-500' : 'text-gray-300'
            ]">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0 transition-transform group-hover:-translate-y-1">
              <UserCard :user="user" />
            </div>
            <div class="w-20 shrink-0 text-right mr-4 flex flex-col items-end">
              <div class="flex items-center justify-end gap-1 text-purple-600 font-bold text-xl whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
                {{ user.followersCount || 0 }}
              </div>
              <span class="text-[10px] text-gray-400 uppercase font-medium">Fans</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import ModelCard from '@/components/ModelCard.vue'
import UserCard from '@/components/UserCard.vue'
import { useModelsStore } from '@/stores/models'
import { onMounted, ref } from 'vue'

const modelsStore = useModelsStore()
const modelRankings = ref([])
const userRankings = ref([])

const calculateModelHeat = (model) => {
  const like = model.likeCount || 0
  const collect = model.collectCount || 0
  return like + (collect * 3)
}

const fetchAllRankings = async () => {
  try {
    const [modelRes, authorRes] = await Promise.all([
      modelsStore.fetchSearchResults({ q: '', type: 'model', sort: 'hot', pageSize: 10 }),
      modelsStore.fetchSearchResults({ q: '', type: 'author', sort: 'hot', pageSize: 10 })
    ])
    modelRankings.value = modelRes.items
    userRankings.value = authorRes.items
  } catch (error) {
    console.error('Failed to fetch:', error)
  }
  console.log(userRankings.value)
}

onMounted(fetchAllRankings)
</script>
