<template>
  <div
    class="group bg-white rounded shadow cursor-pointer border border-gray-100 overflow-hidden flex flex-col h-full transition-all duration-300"
    :class="[layout === 'compact' ? 'hover:shadow-md' : 'hover:shadow-lg hover:-translate-y-1']" @click="handleClick">
    <img :src="model.thumbnailUrl" alt="thumbnail"
      class="w-full object-cover bg-gray-100 transition-all duration-300 ease-in-out" :class="[
        layout === 'compact' ? 'h-32' : 'h-40 sm:h-48 lg:h-56 group-hover:h-72']">

    <div :class="layout === 'compact' ? 'p-2' : 'p-4'">
      <!-- compact模式只显示标题 -->
      <h3 class="font-semibold mb-1 truncate transition-colors duration-300 group-hover:text-blue-600"
        :class="layout === 'compact' ? 'text-sm' : 'text-lg'" :title="model.title">
        {{ model.title }}
      </h3>
      <!-- 默认模式显示简介和作者, 还允许放大 -->
      <div v-if="layout === 'default'"
        class="grid grid-rows-[1fr] opacity-100 transition-all duration-300 ease-in-out group-hover:grid-rows-[0fr] group-hover:opacity-0">
        <div class="overflow-hidden">
          <p class="text-gray-600 text-sm mb-2 mt-1">
            {{ model.description ? model.description.slice(0, 50) + (model.description.length > 50 ? '...' : '') :
              '暂无简介' }}
          </p>
          <p class="text-sm text-gray-500"> 作者: {{ model.author?.username || 'Unknown' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  model: {
    type: Object,
    required: true
  },
  layout: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'compact'].includes(value)
  }
})

const handleClick = () => {
  router.push(`/model/${props.model.id}`)
}
</script>
