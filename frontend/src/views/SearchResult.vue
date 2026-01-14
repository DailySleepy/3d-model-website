<template>
  <div class="flex flex-col">
    <section>
      <div class="container mx-auto px-8 py-4 max-w-6xl">
        <nav class="text-1xl text-gray-600">
          <router-link to="/" class="hover:underline">主页</router-link>
          <span class="mx-2">></span>
          <span class="text-gray-900">搜索页面</span>
        </nav>
      </div>
    </section>
    <div class="container mx-auto px-8 py-4 max-w-6xl">
              <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-2">搜索页面</h1>
          <p class="text-gray-600">支持全局模糊搜索，可精准匹配作者、标题、标签及简介内容。搜索结果支持按最新发布或最高热度灵活排序</p>
        </div>
    <!-- 筛选和排序 -->
    <div class="mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
      <div class="flex gap-4">
        <div class="relative">
          <select v-model="searchType"
            class="appearance-none bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="model">模型</option>
            <option value="author">作者</option>
          </select>
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="relative">
          <select v-model="sort"
            class="appearance-none bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="hot">热门</option>
            <option value="time">时间</option>
          </select>
          <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
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
