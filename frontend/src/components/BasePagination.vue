<template>
  <div class="flex justify-center mt-8">
    <button
      v-for="page in total"
      :key="page"
      :class="['mx-1 px-3 py-1 border rounded', { 'bg-blue-500 text-white': current === page }]"
      @click="emit('change', page)"
    >
      {{ page }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  current: Number,
  total: Number
})
const emit = defineEmits(['change'])
</script>
