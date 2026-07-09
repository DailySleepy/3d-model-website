<template>
  <input
    type="text"
    v-model="localValue"
    @keydown.enter="e => { e.target.blur() }"
    @blur="finishEditing"
    class="node-input-control nodrag bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 text-[10px] focus:outline-none focus:border-[var(--theme-color)] h-[24px]"
    :style="{ '--theme-color': themeColor }"
  />
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    default: ''
  },
  themeColor: {
    type: String,
    default: '#6366f1'
  }
})

const emit = defineEmits(['update:modelValue'])

const localValue = ref('')

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
}, { immediate: true })

const finishEditing = () => {
  const finalVal = localValue.value.trim()
  if (finalVal !== props.modelValue) {
    emit('update:modelValue', finalVal)
  }
}
</script>

<style scoped>
.node-input-control {
  width: 6rem; /* w-24 */
  height: 24px;
  margin-left: auto;
}
</style>
