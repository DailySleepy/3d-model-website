<template>
  <div
    class="relative rounded-xl bg-zinc-900/90 border text-zinc-100 min-w-[180px] backdrop-blur-md shadow-lg select-none"
    :class="selected
      ? 'border-white ring-2 ring-white'
      : 'border-zinc-800/80 hover:shadow-[0_0_16px_var(--theme-border)] hover:border-[var(--theme-color)] transition-all duration-200'"
    :style="{
      '--theme-color': theme.color,
      '--theme-bg': theme.bg,
      '--theme-border': theme.border
    }"
  >
    <!-- Header -->
    <div class="flex items-center px-3 py-1.5 border-b border-[var(--theme-border)] rounded-t-xl transition-all duration-150"
      :style="{ backgroundColor: theme.bg }">
      <span class="text-[13px] font-bold tracking-wide select-none">{{ data.label }}</span>
    </div>

    <div class="nodrag">
      <!-- 特定节点补丁 -->
      <component
        v-if="patchComponent"
        :is="patchComponent"
        :id="id"
        :data="data"
        :theme="theme"
      />

      <!-- Properties -->
      <div v-else-if="hasProperties" class="px-3 pt-2 pb-1 flex flex-col gap-1">
        <div v-for="(property, key) in propertiesConfig" :key="key" class="flex items-center gap-1 text-[10px]">
          <span class="text-zinc-400 font-medium select-none">{{ property.label || key }}</span>

          <select
            v-if="property.options"
            :value="data.properties?.[key] ?? property.default"
            @change="e => onPropertyChange(key, e.target.value)"
            class="node-input-control nodrag bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 text-[10px] focus:outline-none focus:border-[var(--theme-color)] cursor-pointer"
          >
            <option v-for="opt in property.options" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>

          <NumberDragInput
            v-else-if="shouldShowDrag(property)"
            :modelValue="data.properties?.[key] ?? property.default"
            @update:modelValue="val => onPropertyChange(key, val)"
            :step="getStepSize(property)"
            :theme-color="theme.color"
            class="node-input-control"
          />
        </div>
      </div>
    </div>

    <!-- Sockets -->
    <div class="flex flex-col pt-0.5 pb-1.5">
      <!-- Inputs -->
      <div v-for="input in inputsConfig" :key="input.id" class="relative flex items-center gap-2 px-3 h-7">
        <Handle
          type="target"
          :id="input.id"
          :position="Position.Left"
          :style="{ background: getSocketColor(input) }"
          class="!w-2 !h-2 !border-0 !left-[-4px] !top-1/2 !-translate-y-1/2 cursor-crosshair handle-hitbox !z-10"
        />
        <span class="text-zinc-400 font-mono font-semibold text-[14px] h-4 flex items-center select-none">{{ input.id }}</span>

        <NumberDragInput
          v-if="shouldShowDrag(input, input.id)"
          :modelValue="data.inputs?.[input.id] ?? input.defaultValue ?? 0"
          @update:modelValue="val => onInputChange(input.id, val)"
          :step="getStepSize(input)"
          :theme-color="theme.color"
          class="node-input-control"
        />
      </div>

      <!-- Outputs -->
      <div v-for="output in outputsConfig" :key="output.id" class="relative flex items-center gap-2 px-3 h-7">
        <span class="ml-auto text-zinc-400 font-mono font-semibold text-[14px] h-4 flex items-center select-none">{{ output.id }}</span>
        <Handle
          type="source"
          :id="output.id"
          :position="Position.Right"
          :style="{ background: getSocketColor(output) }"
          class="!w-2 !h-2 !border-0 !right-[-4px] !top-1/2 !-translate-y-1/2 cursor-crosshair handle-hitbox !z-10"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, onUnmounted } from 'vue';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import { getDimension, nodeRegistry } from '@/rendering/shader-graph/nodeRegistry';
import { useShaderGraphStore } from '../stores/shaderGraph.js';

import NumberDragInput from './NumberDragInput.vue';
import ColorNodePatch from './NodePatches/ColorNodePatch.vue';
import CustomNodePatch from './NodePatches/CustomNodePatch.vue';

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

const store = useShaderGraphStore()

const PATCH_REGISTRY = {
  color: ColorNodePatch,
  custom: CustomNodePatch,
}
const patchComponent = PATCH_REGISTRY[props.type] || null

const CATEGORY_THEMES = {
  OUTPUT: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.3)', border: 'rgba(239, 68, 68, 0.4)' }, // 红色
  CONSTANT: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.3)', border: 'rgba(34, 197, 94, 0.4)' }, // 绿色
  GEOMETRY: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.3)', border: 'rgba(59, 130, 246, 0.4)' }, // 蓝色
  VECTOR: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.3)', border: 'rgba(168, 85, 247, 0.4)' }, // 紫色
  MATH: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.3)', border: 'rgba(249, 115, 22, 0.4)' }, // 橙色
  ADVANCED: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.65)', border: 'rgba(234, 179, 8, 0.4)' }, // 黄色
  CUSTOM: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.3)', border: 'rgba(6, 182, 212, 0.4)' } // 青色
}
const theme = CATEGORY_THEMES[props.data.category] || CATEGORY_THEMES.MATH

const nodeConfig = nodeRegistry[props.type]
const propertiesConfig = nodeConfig.properties || {}
const inputsConfig = computed(() => {
  const inputs = nodeConfig.inputs || []
  return inputs.filter(input => {
    if (typeof input.visible === 'function') {
      return input.visible(props.data.properties || {})
    }
    return true
  })
})
const outputsConfig = computed(() => {
  const outputs = nodeConfig.outputs || []
  return outputs.filter(output => {
    if (typeof output.visible === 'function') {
      return output.visible(props.data.properties || {})
    }
    return true
  })
})

const hasProperties = Object.keys(propertiesConfig).length > 0

/**
 * @param {object} config - 元数据配置
 * @param {string} socketId - 仅 input 使用此项
 */
const shouldShowDrag = (config, socketId) => {
  if (config.hideInput) return false

  let type = config.type ?? config.defaultType // properties.value.type / inputs[i].defaultType
  if (typeof type === 'function') {
    type = type(props.data.properties || {})
  }
  if (!['float', 'int'].includes(type)) return false // 需要是 float, int

  if (socketId === undefined) return true // 如果是 properties, 到这里就可以直接放行了

  const isConnected = store.inputSocketsAcitveMap.get(props.id)?.has(socketId) ?? false
  return !isConnected // 需要插槽未连接
}

const getStepSize = (config) => {
  let type = config.type ?? config.defaultType
  if (typeof type === 'function') {
    type = type(props.data.properties || {})
  }
  return type === 'int' ? 1 : 0.1
}

const getSocketColor = (socket) => {
  if (socket.isDynamic) {
    return '#c084fc' // 动态维度: 亮紫色
  }
  let type = socket.defaultType || 'float'
  if (typeof type === 'function') {
    type = type(props.data.properties || {})
  }
  const dim = getDimension(type)
  const colors = {
    1: '#2aff82', // 绿
    2: '#33b5ff', // 蓝
    3: '#ffea00', // 黄
    4: '#ff33aa'  // 粉
  }
  return colors[dim] || '#a1a1aa' // 错误: 灰
}

const onPropertyChange = (key, val) => {
  const isNum = typeof propertiesConfig[key].default === 'number'
  const processedVal = isNum ? (Number(val) || 0) : val

  store.updateNodeData(props.id, {
    properties: { ...props.data.properties, [key]: processedVal }
  })
}

const onInputChange = (socketId, val) => {
  store.updateNodeData(props.id, {
    inputs: { ...props.data.inputs, [socketId]: Number(val) || 0 }
  })
}

</script>

<style scoped>
.node-input-control {
  width: 6rem; /* w-24 */
  height: 24px;
  margin-left: auto;
}

.handle-hitbox::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  background: transparent;
  border-radius: 50%;
  cursor: crosshair;
  z-index: 10;
}
</style>
