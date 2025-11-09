<template>
  <div
    class="bg-white rounded shadow cursor-pointer hover:shadow-lg transition"
    @click="emit('click', model.id)"
  >
    <img :src="model.thumbnailUrl" alt="thumbnail" class="w-full h-48 object-cover rounded-t">
    <div class="p-4">
      <h3 class="font-semibold text-lg mb-1">{{ model.title }}</h3>
      <p class="text-gray-600 text-sm mb-2">{{ model.description?.slice(0, 50) }}...</p>
      <p class="text-sm text-gray-500">作者: {{ model.author?.username }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  model: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['click'])
</script>
