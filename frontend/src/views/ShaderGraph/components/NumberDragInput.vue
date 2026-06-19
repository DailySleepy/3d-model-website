<template>
  <div
    class="relative flex items-center bg-zinc-950 border border-white/10 rounded overflow-hidden select-none
      hover:border-[var(--theme-color)] transition-colors group h-[20px] min-w-[70px] nodrag"
    :style="{ '--theme-color': themeColor }"
  >
    <input
      v-if="isEditing"
      ref="inputRef"
      type="text"
      v-model="localInputValue"
      @keydown.esc="cancelEditing"
      @keydown.enter="finishEditing"
      @blur="finishEditing"
      class="w-full h-full text-center bg-zinc-900 border-0 text-white font-mono text-[11px] focus:outline-none select-text cursor-text px-1"
    >

    <template v-else>
      <button
        type="button"
        @click.stop="increase(-1)"
        class="w-4 h-full flex items-center justify-center text-[9px] text-zinc-500 hover:text-zinc-100 hover:bg-white/5 active:bg-white/10 transition-colors border-r border-white/5 select-none shrink-0"
      >
        ◀
      </button>

      <div
        @mousedown="onMouseDown"
        class="w-full h-full flex items-center justify-center text-center text-white font-mono text-[11px] cursor-ew-resize select-none"
      >
        {{ modelValue }}
      </div>

      <button
        type="button"
        @click.stop="increase(1)"
        class="w-4 h-full flex items-center justify-center text-[9px] text-zinc-500 hover:text-zinc-100 hover:bg-white/5 active:bg-white/10 transition-colors border-l border-white/5 select-none shrink-0"
      >
        ▶
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  step: { type: Number, default: 0.1 },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  themeColor: { type: String, default: '#6366f1' }
})

const emit = defineEmits(['update:modelValue'])

const updateModelValue = (val) => {
  if (val !== props.modelValue) {
    emit('update:modelValue', val)
  }
}

const inputRef = ref(null)
const isEditing = ref(false)
const localInputValue = ref('')

const clamp = (val) => {
  let v = Number(val)

  if (isNaN(v)) return 0

  if (props.min !== undefined && v < props.min) v = props.min
  if (props.max !== undefined && v > props.max) v = props.max

  if (props.step % 1 === 0) return Math.round(v)
  return parseFloat(v.toFixed(6))
}

const increase = (sign) => {
  const nextVal = clamp(props.modelValue + sign * props.step)
  updateModelValue(nextVal)
}

const finishEditing = () => {
  if (isEditing.value) {
    isEditing.value = false

    const rawValue = localInputValue.value.trim()

    if (rawValue === '' || isNaN(Number(rawValue))) return

    const val = clamp(Number(rawValue))
    updateModelValue(val)
  }
}

const cancelEditing = () => {
  isEditing.value = false
}

let startX = 0
let startValue = 0
let hasMoved = false

const onMouseDown = (e) => {
  startX = e.clientX
  startValue = props.modelValue
  hasMoved = false

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

const onMouseMove = (e) => {
  const deltaX = e.clientX - startX

  if (Math.abs(deltaX) > 2) {
    hasMoved = true

    let speed = 1.0
    if (e.shiftKey) speed = 0.1
    else if (e.ctrlKey || e.mataKey) speed = 10.0

    const pixelsPerStep = 8
    const stepCount = deltaX > 0
      ? Math.round(deltaX / pixelsPerStep)
      : -Math.round(Math.abs(deltaX) / pixelsPerStep)

    const deltaValue = props.step * stepCount * speed
    const nextVal = clamp(startValue + deltaValue)
    updateModelValue(nextVal)
  }
}

const onMouseUp = async () => {
  cleanGlobalState()

  if (!hasMoved) {
    isEditing.value = true
    localInputValue.value = String(props.modelValue)

    await nextTick()
    if (inputRef.value) {
      inputRef.value.focus()
      inputRef.value.select()
    }
  }
}

onUnmounted(() => {
  cleanGlobalState()
})

const cleanGlobalState = () => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

</script>
