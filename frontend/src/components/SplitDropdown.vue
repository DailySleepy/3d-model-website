<template>
  <div
    class="relative flex items-center h-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-xs shrink-0 select-none transition-all shadow-sm"
  >
    <button
      @click="$emit('clickMain')"
      class="px-2.5 py-1 transition-all duration-150 flex items-center gap-1.5 cursor-pointer font-medium rounded-l-lg h-full text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      :title="title"
    >
      <slot name="icon"></slot>
      <span>{{ labelPrefix }}: {{ currentLabel }}</span>
    </button>

    <div class="w-[1px] h-3.5 bg-gray-200 dark:bg-gray-700"></div>

    <button
      @click="showDropdown = !showDropdown"
      @blur="closeDropdown"
      class="px-1.5 py-1 transition-all duration-150 rounded-r-lg cursor-pointer h-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3 text-gray-500 dark:text-gray-400">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div
      v-show="showDropdown"
      class="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-30 flex flex-col text-[11px] font-medium"
      :class="dropdownWidth"
    >
      <template v-for="(opt, idx) in options" :key="opt.value || 'divider-' + idx">
        <!-- 渲染分割线 -->
        <div
          v-if="opt.divider"
          class="my-1 border-t border-gray-100 dark:border-gray-700"
        ></div>

        <!-- 渲染选项按钮 -->
        <button
          v-else
          @mousedown="selectMode(opt.value)"
          class="px-3 py-1.5 text-left transition-all w-full"
          :class="modelValue === opt.value ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        >
          {{ opt.desc }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, required: true }, // 当前选中的模式
  options: { type: Array, required: true },    // 下拉选项配置列表
  labelPrefix: { type: String, required: true }, // 按钮文本前缀
  title: { type: String, default: '' },         // 鼠标悬停提示
  dropdownWidth: { type: String, default: 'w-32' } // 下拉框宽度
})

const emit = defineEmits(['update:modelValue', 'clickMain'])

const showDropdown = ref(false)

const closeDropdown = () => {
  showDropdown.value = false
}

const selectMode = (value) => {
  emit('update:modelValue', value)
  showDropdown.value = false
}

const currentLabel = computed(() => {
  const currentOpt = props.options.find(opt => !opt.divider && opt.value === props.modelValue)
  return currentOpt ? currentOpt.label : ''
})
</script>

