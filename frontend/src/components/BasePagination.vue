<template>
  <div class="flex justify-center mt-8 items-center space-x-1">

    <!-- 上一页按钮 -->
    <button
      class="px-3 py-1 border rounded"
      :disabled="current === 1"
      @click="emit('change', current - 1)"
    >
      上一页
    </button>

    <!-- 页面索引 -->
    <button
      v-for="page in visiblePages"
      :key="page"
      @click="emit('change', page)"
      :disabled="page === '...'"
      :class="[
        'px-3 py-1 border rounded',
        { 'bg-blue-500 text-white': current === page },
      ]"
    >
      {{ page }}
    </button>

    <!-- 下一页按钮 -->
    <button
      class="px-3 py-1 border rounded"
      :disabled="current === total"
      @click="emit('change', current + 1)"
    >
      下一页
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: Number,
  total: Number
})
const emit = defineEmits(['change'])

const visiblePages = computed(() => {
  const pages = []
  const total = props.total
  const current = props.current
  console.log("total: " + total)
  console.log("current: " + current)

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }

  return pages
})
</script>
