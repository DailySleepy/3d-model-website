<template>
  <div class="min-h-screen p-4">

    <!-- 筛选和排序 -->
    <div class="flex justify-between mb-4 bg-white p-4 rounded shadow">
      <select v-model="searchType" class="border px-2 py-1">
        <option value="model">模型</option>
        <option value="author">作者</option>
      </select>
      <select v-model="sort" class="border px-2 py-1">
        <option value="hot">热门</option>
        <option value="time">时间</option>
      </select>
    </div>

    <!-- 模型列表 -->
    <div class="grid grid-cols-4 gap-4">
      <ModelCard v-for="model in models" :key="model.id" :model="model" @click="goToDetail(model.id)" />
    </div>

    <!-- 分页 -->
    <BasePagination :current="currentPage" :total="totalPages" @change="handlePageChange" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useModelsStore } from '@/stores/models'
import ModelCard from '@/components/ModelCard.vue'
import BasePagination from '@/components/BasePagination.vue'

//import { mockModels } from '@/mock/model.js' // MOCK

const PAGE_SIZE = 12

const route = useRoute()
const router = useRouter()
const modelsStore = useModelsStore()

const query = ref(route.query.q || '')
const searchType = ref(route.query.type || 'model')
const sort = ref(route.query.sort || 'hot')
const currentPage = ref(1)
const totalPages = ref(1)
const models = ref([])

const handlePageChange = (page) => {
  currentPage.value = page
  fetchModels()
}

// 监听路由变化
watch(
  () => route.query,
  (newQuery) => {
    query.value = newQuery.q || ''
    searchType.value = newQuery.type || 'model'
    sort.value = newQuery.sort || 'hot'
    currentPage.value = Number(newQuery.page) || 1
    fetchModels()
  },
  { immediate: true }
)

// 监听筛选、排序变化, 转换为路由变化
watch([searchType, sort], () => {
  router.push({
    path: '/search',
    query: {
      q: query.value,
      type: searchType.value,
      sort: sort.value,
      page: 1
    }
  })
})

// // MOCK
// //--------------------------------------------------------

// // 字符串生成种子
// function stringToSeed(str) {
//   let hash = 0
//   for (let i = 0; i < str.length; i++) {
//     hash = (hash * 31 + str.charCodeAt(i)) >>> 0
//   }
//   return hash
// }

// // 稳定伪随机数
// function seededRandom(seed) {
//   const x = Math.sin(seed++) * 10000
//   return x - Math.floor(x)
// }

// // 模拟搜索（基于关键词 + 类型 + 排序）
// // 模拟搜索（仅用 seed 打乱顺序）
// function mockSearchModels(params) {
//   const { q, type, sort, page } = params

//   // 组合种子
//   const seedInput = `${q}-${type}-${sort}`
//   const seed = stringToSeed(seedInput)

//   // 拷贝数组
//   let shuffled = [...mockModels]

//   // 根据种子稳定打乱（洗牌算法）
//   for (let i = 0; i < shuffled.length; i++) {
//     const j = Math.floor(seededRandom(seed + i) * shuffled.length)
//     ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
//   }

//   // 模拟排序方式
//   if (sort === 'time') {
//     shuffled.reverse()
//   }

//   // 分页逻辑
//   const start = (page - 1) * PAGE_SIZE
//   const end = Math.min(start + PAGE_SIZE, shuffled.length)
//   const pageData = shuffled.slice(start, end)

//   return {
//     models: pageData,
//     totalPages: Math.max(1, Math.ceil(shuffled.length / PAGE_SIZE))
//   }
// }


// async function fetchModels() {
//   const params = {
//     q: query.value,
//     type: searchType.value,
//     sort: sort.value,
//     page: currentPage.value
//   }

//   const result = mockSearchModels(params)
//   models.value = result.models
//   totalPages.value = result.totalPages
// }

// //--------------------------------------------------------


async function fetchModels() {
  const params = {
    q: query.value,
    type: searchType.value,
    sort: sort.value,
    page: currentPage.value,
    pageSize: PAGE_SIZE
  }
  const result = await modelsStore.searchModels(params)
  models.value = result.models
  totalPages.value = result.totalPages
}

const goToDetail = (id) => {
  router.push(`/model/${id}`)
}
</script>
