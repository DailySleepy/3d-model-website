<template>
  <div class="relative h-full" v-click-outside="close">
    <!-- Trigger Slot -->
    <div class="h-full cursor-pointer" @click="toggle">
      <slot name="trigger" :open="isOpen"></slot>
    </div>

    <!-- Content Panel -->
    <div
      v-show="isOpen"
      class="absolute right-0 top-full mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-30 select-none text-xs"
      :class="panelClass"
    >
      <slot name="content" :close="close"></slot>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  panelClass: {
    type: String,
    default: 'w-64 p-4'
  }
})

const isOpen = ref(false)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}
</script>
