<template>
  <Transition name="fade-scale">
    <div
      ref="menuRef"
      class="absolute bg-zinc-900/95 border border-zinc-800 rounded-xl p-2 w-56 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
      :style="{ left: `${searchMenu.x}px`, top: `${searchMenu.y}px` }"
      @click.stop
    >
      <input
        type="text"
        ref="searchInputRef"
        v-model="searchQuery"
        @keydown.esc.prevent="emit('close')"
        @keydown.enter.prevent="confirmSelect"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.down.prevent="moveActive(1)"
        placeholder="搜索节点..."
        class="w-full bg-zinc-950 border border-zinc-800 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
      >

      <div class="relative mt-1.5 max-h-48 overflow-y-auto flex flex-col gap-0.5 scrollbar-thin" ref="listContainerRef">
        <button
          v-for="(node, index) in filteredSearchNodes"
          :key="node.type"
          @click="spawnNodeAndClose(node.type)"
          :class="[
            'w-full text-left px-2 py-1 text-[11px] rounded truncate shrink-0',
            activeSearchIndex === index ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
          ]"
        >
          {{ node.label }}
        </button>

        <div v-if="filteredSearchNodes.length === 0" class="text-zinc-500 text-[10px] text-center py-2">
          未找到匹配的节点
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { pinyin } from 'pinyin-pro'
import { nodeRegistry } from '@/rendering/nodeRegistry';

const props = defineProps({
  searchMenu: {
    type: Object,
    required: true,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close', 'spawnNode'])

const searchInputRef = ref(null)
const listContainerRef = ref(null)
const searchQuery = ref('')
const activeSearchIndex = ref(0)

const menuRef = ref(null)

const handleOutsideClick = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    emit('close')
  }
}

const generatePinyinSearchStr = (label) => {
  if (!label) return ''
  const matches = label.match(/\p{Script=Han}+/gu)
  if (!matches) return ''
  const cnStr = matches.join('')
  const fullPinyin = pinyin(cnStr, { toneType: 'none' }).replace(/\s+/g, '')
  const shouzimu = pinyin(cnStr, { pattern: 'first' }).replace(/\s+/g, '').toLowerCase()
  return `${fullPinyin} ${shouzimu}`
}

const allAvailableNodes = Object.entries(nodeRegistry)
  .filter(([, config]) => config.category !== 'OUTPUT' && !config.hidden)
  .map(([type, config]) => ({
    type,
    label: config.label || type,
    category: config.category || '',
    pinyinStr: generatePinyinSearchStr(config.label)
  }))

const filteredSearchNodes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return allAvailableNodes
  return allAvailableNodes.filter((n) =>
    n.type.toLowerCase().includes(query) ||
    n.label.toLowerCase().includes(query) ||
    n.pinyinStr.includes(query)
  )
})

watch(filteredSearchNodes, () => { activeSearchIndex.value = 0 })

const moveActive = async (direction) => {
  const count = filteredSearchNodes.value.length
  if (count === 0) return
  activeSearchIndex.value = (activeSearchIndex.value + direction + count) % count

  await nextTick()
  const container = listContainerRef.value
  if (!container) return
  const activeEl = container.children[activeSearchIndex.value]
  if (!activeEl) return
  const containerTop = container.scrollTop
  const containerBottom = containerTop + container.clientHeight
  const elTop = activeEl.offsetTop
  const elBottom = elTop + activeEl.clientHeight
  if (elTop < containerTop) container.scrollTop = elTop
  else if (elBottom > containerBottom) container.scrollTop = elBottom - container.clientHeight
}

const spawnNodeAndClose = (type) => {
  emit('spawnNode', type)
  emit('close')
}

const confirmSelect = () => {
  const selectedNode = filteredSearchNodes.value[activeSearchIndex.value]
  if (selectedNode) spawnNodeAndClose(selectedNode.type)
}

onMounted(async () => {
  await nextTick()
  searchInputRef.value?.focus()
  window.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
})

</script>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.12s ease-out;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
</style>
