<template>
  <div class="flex justify-center">
    <input
      v-model="query"
      type="text"
      placeholder="搜索模型或作者..."
      class="w-96 border rounded-l px-4 py-2 focus:outline-none focus:border-blue-500"
      @keyup.enter="handleSearch"
    >
    <button @click="handleSearch" class="bg-blue-500 text-white px-6 py-2 rounded-r hover:bg-blue-600">
      搜索
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const query = ref('')

const emit = defineEmits(['search'])

const handleSearch = () => {
  if (query.value) {
    router.push({ path: '/search', query: { q: query.value } })
    emit('search', query.value) // UNUSED: 将搜索的内容传递到 App.vue
  }
}

</script>
