<template>
  <div class="relative w-full overflow-hidden">
    <div
      class="flex transition-transform duration-500 "
      :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
    >
      <img
        v-for="(slide, idx) in slides"
        :key="idx"
        :src="slide"
        alt="slide"
        class="w-full flex-shrink-0 object-contain"
      />
    </div>

    <button
      @click="handleMouseAction(prev)"
      class="absolute top-1/2 left-2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded hover:bg-opacity-70 z-10"
    >
      &#10094;
    </button>
    <button
      @click="handleMouseAction(next)"
      class="absolute top-1/2 right-2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded hover:bg-opacity-70 z-10"
    >
      &#10095;
    </button>

    <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
      <span
        v-for="(slide, idx) in slides"
        :key="idx"
        @mouseenter="handleMouseAction(setImageIndex(idx))"
        class="w-3 h-3 rounded-full cursor-pointer transition-colors"
        :class="idx === currentIndex ? 'bg-blue-500' : 'bg-white hover:bg-blue-400'"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const slides = [
  '/carousel/slide1.jpg',
  '/carousel/slide2.jpg',
  '/carousel/slide3.jpg',
  '/carousel/slide4.jpg',
  '/carousel/slide5.jpg',
]

const currentIndex = ref(0)
let timer = null
const interval = 4000

const startTimer = () => {
  timer = setInterval(next, interval)
}

const resetTimer = () => {
  clearInterval(timer)
  startTimer()
}

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % slides.length
}

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + slides.length) % slides.length
}

const setImageIndex = (idx) => {
  currentIndex.value = idx
}

const handleMouseAction = (action) => {
  action()
  resetTimer()
}


onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>
