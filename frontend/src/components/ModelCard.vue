<template>
  <div @click="handleClick"
    class="group h-[340px] bg-white rounded shadow cursor-pointer border border-gray-100 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    
    <img :src="model.thumbnailUrl" alt="thumbnail"
      class="w-full object-cover bg-gray-100 transition-all duration-300 ease-in-out flex-1 min-h-0">

    <div class="p-4">
      <h3 class="font-semibold mb-1 truncate transition-colors duration-300 group-hover:text-blue-600 text-lg"
        :title="model.title">
        {{ model.title }}
      </h3>

      <div
        class="grid grid-rows-[1fr] opacity-100 transition-all duration-300 ease-in-out group-hover:grid-rows-[0fr] group-hover:opacity-0">
        <div class="overflow-hidden">
          <p class="text-gray-600 text-sm mb-2 mt-1">
            {{ model.description ? model.description.slice(0, 50) + (model.description.length > 50 ? '...' : '') :
              '暂无简介' }}
          </p>
          <p class="text-sm text-gray-500"> 作者: {{ authorName || 'Unknown' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/api'

const router = useRouter()
const props = defineProps({
  model: {
    type: Object,
    required: true
  }
})

const authorName = ref()

const handleClick = () => {
  router.push(`/model/${props.model.id}`)
}

const loadAuthor = async (authorId) => {
  if (!authorId) return
  try {
    const res = await userApi.getById(authorId)
    authorName.value = res.data.username
  } catch (e) {
    console.error('failed to load author', e)
  }
}

onMounted(() => {
  loadAuthor(props.model.authorId)
})

</script>
