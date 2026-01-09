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

    <!-- 模型列表 or 用户列表 -->
    <div class="grid grid-cols-4 gap-4">
      <template v-if="searchType === 'model'">
        <ModelCard v-for="model in searchResults" :key="model.id" :model="model" />
      </template>
      <template v-else-if="searchType === 'author'">
        <UserCard v-for="user in searchResults" :key="user.id" :user="user" />
      </template>
    </div>

    <!-- 分页 -->
    <BasePagination :current="currentPage" :total="totalPages" @change="handlePageChange" />
  </div>
</template>

<script setup>
import BasePagination from '@/components/BasePagination.vue'
import ModelCard from '@/components/ModelCard.vue'
import UserCard from '@/components/UserCard.vue'
import { useModelsStore } from '@/stores/models'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const PAGE_SIZE = 12

const route = useRoute()
const router = useRouter()
const modelsStore = useModelsStore()

const query = ref(route.query.q || '')
const searchType = ref(route.query.type || 'model')
const sort = ref(route.query.sort || 'hot')
const currentPage = ref(1)
const totalPages = ref(1)
const searchResults = ref([])

const handlePageChange = (page) => {
  currentPage.value = page
  fetchSearchResults()
}

// 监听路由变化
watch(
  () => route.query,
  (newQuery) => {
    query.value = newQuery.q || ''
    searchType.value = newQuery.type || 'model'
    sort.value = newQuery.sort || 'hot'
    currentPage.value = Number(newQuery.page) || 1
    fetchSearchResults()
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

async function fetchSearchResults() {
  const params = {
    q: query.value,
    type: searchType.value,
    sort: sort.value,
    page: currentPage.value,
    pageSize: PAGE_SIZE
  }
  const result = await modelsStore.fetchSearchResults(params)
  console.log(result)
  searchResults.value = result.items
  totalPages.value = result.totalPages
}

</script>
