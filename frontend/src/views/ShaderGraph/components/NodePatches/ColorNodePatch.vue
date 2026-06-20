<template>
  <div class="flex flex-col gap-2 px-3 py-2 text-[11px] text-zinc-300">

    <div class="flex items-center justify-between gap-2">
      <span class="text-zinc-400 font-medium select-none">Color</span>
      <button @click="isExpanded = !isExpanded"
        class="w-24 h-5 rounded border border-zinc-700/80 shadow-inner cursor-pointer transition-transform active:scale-95"
        :style="{ backgroundColor: hexValue }" title="点击展开/收起调色盘">
      </button>
    </div>

    <div v-if="isExpanded"
      class="flex flex-col gap-2.5 mt-1 p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/60 animate-fade-in">

      <div class="flex gap-2.5 justify-center items-center h-28">
        <!-- 色轮 -->
        <div class="relative w-24 h-24">
          <canvas ref="wheelCanvas" width="96" height="96" class="rounded-full cursor-crosshair border border-zinc-800"
            @mousedown="startTrackWheel">
          </canvas>
          <div class="absolute inset-0 rounded-full bg-black pointer-events-none"
            :style="{ opacity: 1 - hsv.v }">
          </div>
          <div class="absolute w-2 h-2 border border-white rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow"
            :style="{ left: `${wheelPointer.x}px`, top: `${wheelPointer.y}px`, backgroundColor: hexValue }">
          </div>
        </div>

        <!-- 饱和度 -->
        <div ref="sliderBarS" class="w-4 h-24 rounded border border-zinc-800 cursor-ns-resize relative"
          :style="{ background: sSliderBg }" @mousedown="startTrackSaturation" title="饱和度 (S)">
          <div class="absolute left-0 right-0 h-[2px] bg-white border-y border-black/50 pointer-events-none transform translate-y-1/2"
            :style="{ bottom: `${hsv.s * 100}%` }">
          </div>
        </div>

        <!-- 明度 -->
        <div ref="sliderBarV" class="w-4 h-24 rounded border border-zinc-800 cursor-ns-resize relative"
          :style="{ background: vSliderBg }" @mousedown="startTrackValue" title="明度 (V)">
          <div class="absolute left-0 right-0 h-[2px] bg-white border-y border-black/50 pointer-events-none transform translate-y-1/2"
            :style="{ bottom: `${hsv.v * 100}%` }">
          </div>
        </div>
      </div>

      <div class="flex bg-zinc-900 rounded p-0.5 border border-zinc-800/80">
        <button v-for="mode in ['RGB', 'HSV']" :key="mode" @click="displayMode = mode"
          class="flex-1 py-0.5 text-center rounded transition-all select-none cursor-pointer text-[10px]"
          :class="displayMode === mode ? 'bg-zinc-700 text-white font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-300'">
          {{ mode }}
        </button>
      </div>

      <div class="flex flex-col gap-1.5">
        <div v-for="channel in currentChannels" :key="channel.key" class="flex items-center justify-between">
          <span class="text-zinc-500 font-mono font-bold uppercase w-4">{{ channel.label }}</span>
          <NumberDragInput
            :modelValue="channel.value"
            @update:modelValue="val => onSliderChange(channel.key, val)"
            :step="channel.step"
            :min="0"
            :max="channel.max"
            :theme-color="theme.color"
            class="!w-32 !h-[20px]"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 border-t border-zinc-800/80 pt-2">
        <span class="text-zinc-500 font-mono text-[10px] w-8">0-255</span>
        <div class="flex gap-1 flex-1">
          <div v-for="ch in ['r', 'g', 'b']" :key="ch"
            class="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1 flex-1">
            <input v-select-on-focus type="number" min="0" max="255" :value="rgb255[ch]"
              @input="e => onRgb255Change(ch, e.target.value)"
              class="w-full bg-transparent text-zinc-200 text-[10px] font-mono focus:outline-none text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 border-t border-zinc-800/80 pt-1.5">
        <span class="text-zinc-500 font-mono text-[10px] w-8">HEX</span>
        <input v-select-on-focus type="text" v-model="hexInputStr" @blur="onHexBlur" @keydown.enter="onHexBlur"
          class="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-[10px] font-mono px-1.5 py-0.5 rounded focus:outline-none focus:border-[var(--theme-color)]">
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, nextTick } from 'vue'
import NumberDragInput from '../NumberDragInput.vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  theme: { type: Object, required: true }
})

const updateNodeData = inject('updateNodeData')

const isExpanded = ref(false)
const displayMode = ref('RGB')
const wheelCanvas = ref(null)
const sliderBarS = ref(null)
const sliderBarV = ref(null)
const hexInputStr = ref('#ffffff')

const rgb = computed(() => ({
  r: props.data.properties?.value?.r ?? 1.0,
  g: props.data.properties?.value?.g ?? 1.0,
  b: props.data.properties?.value?.b ?? 1.0,
}))

const rgb255 = computed(() => ({
  r: Math.round(rgb.value.r * 255),
  g: Math.round(rgb.value.g * 255),
  b: Math.round(rgb.value.b * 255),
}))

const hsv = computed(() => rgbToHsv(rgb.value.r, rgb.value.g, rgb.value.b))

const hexValue = computed(() => rgbToHex(rgb.value.r, rgb.value.g, rgb.value.b))

const vSliderBg = computed(() => {
  const { r, g, b } = hsvToRgb(hsv.value.h, hsv.value.s, 1)
  return `linear-gradient(to top, #000, ${rgbToHex(r, g, b)})`
})

const sSliderBg = computed(() => {
  const { r, g, b } = hsvToRgb(hsv.value.h, 1, hsv.value.v)
  return `linear-gradient(to top, #fff, ${rgbToHex(r, g, b)})`
})

watch(hexValue, (newHex) => {
  hexInputStr.value = newHex
}, { immediate: true })

watch(isExpanded, async () => {
  if (!isExpanded.value) return
  await nextTick()
  if (wheelCanvas.value) drawColorWheel(wheelCanvas.value)
})

const currentChannels = computed(() => {
  if (displayMode.value === 'RGB') {
    return [
      { label: 'r', key: 'r', value: rgb.value.r, max: 1.0, step: 0.01 },
      { label: 'g', key: 'g', value: rgb.value.g, max: 1.0, step: 0.01 },
      { label: 'b', key: 'b', value: rgb.value.b, max: 1.0, step: 0.01 }
    ]
  } else {
    return [
      { label: 'h', key: 'h', value: Math.round(hsv.value.h), max: 360, step: 1 },
      { label: 's', key: 's', value: parseFloat(hsv.value.s.toFixed(2)), max: 1.0, step: 0.01 },
      { label: 'v', key: 'v', value: parseFloat(hsv.value.v.toFixed(2)), max: 1.0, step: 0.01 }
    ]
  }
})

const emitColorChange = (newRgb) => {
  updateNodeData(props.id, {
    properties: {
      ...props.data.properties,
      value: {
        r: Math.max(0, Math.min(1, newRgb.r)),
        g: Math.max(0, Math.min(1, newRgb.g)),
        b: Math.max(0, Math.min(1, newRgb.b))
      }
    }
  })
}

const onSliderChange = (key, val) => {
  if (displayMode.value === 'RGB') {
    emitColorChange({ ...rgb.value, [key]: val })
  } else {
    const nextHsv = { ...hsv.value, [key]: val }
    emitColorChange(hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v))
  }
}

const onRgb255Change = (channel, val) => {
  if (val === '') return
  const num = Math.max(0, Math.min(255, parseInt(val) || 0))
  const nextRgb = { ...rgb.value }
  nextRgb[channel] = num / 255
  emitColorChange(nextRgb)
}

const onHexBlur = () => {
  let hex = hexInputStr.value.trim()
  if (!hex.startsWith('#')) hex = '#' + hex
  const reg = /^#([0-9a-fA-F]{3}){1,2}$/
  if (reg.test(hex)) {
    emitColorChange(hexToRgb(hex))
  } else {
    hexInputStr.value = hexValue.value
  }
}

const wheelPointer = computed(() => {
  const r = 48
  const angle = (hsv.value.h * Math.PI) / 180
  const dist = hsv.value.s * r
  return {
    x: r + dist * Math.cos(angle),
    y: r + dist * Math.sin(angle)
  }
})

const setupDrag = (initialEvent, onDrag) => {
  onDrag(initialEvent)

  const onMouseMove = (e) => onDrag(e)
  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const startTrackWheel = (e) => {
  const rect = wheelCanvas.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2

  setupDrag(e, (evt) => {
    const x = evt.clientX - rect.left - cx
    const y = evt.clientY - rect.top - cy
    let angle = Math.atan2(y, x) * (180 / Math.PI)
    if (angle < 0) angle += 360
    const dist = Math.sqrt(x * x + y * y)
    const s = Math.min(1, dist / cx)

    emitColorChange(hsvToRgb(angle, s, hsv.value.v))
  })
}

const startTrackSaturation = (e) => {
  const rect = sliderBarS.value.getBoundingClientRect()

  setupDrag(e, (evt) => {
    const y = evt.clientY - rect.top
    const pct = 1 - Math.max(0, Math.min(1, y / rect.height))
    emitColorChange(hsvToRgb(hsv.value.h, pct, hsv.value.v))
  })
}

const startTrackValue = (e) => {
  const rect = sliderBarV.value.getBoundingClientRect()

  setupDrag(e, (evt) => {
    const y = evt.clientY - rect.top
    const pct = 1 - Math.max(0, Math.min(1, y / rect.height))
    emitColorChange(hsvToRgb(hsv.value.h, hsv.value.s, pct))
  })
}

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, v = max
  const d = max - min
  s = max === 0 ? 0 : d / max

  if (max === min) {
    h = 0
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s, v }
}

function hsvToRgb(h, s, v) {
  let r, g, b
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }
  return { r, g, b }
}

function rgbToHex(r, g, b) {
  const toHex = (val) => Math.round(val * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 }
}

const drawColorWheel = (canvas) => {
  const ctx = canvas.getContext('2d')
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = canvas.width / 2

  const imageData = ctx.createImageData(canvas.width, canvas.height)
  const data = imageData.data

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist <= r) {
        let angle = Math.atan2(dy, dx) * (180 / Math.PI)
        if (angle < 0) angle += 360

        const s = dist / r
        const { r: rgbR, g: rgbG, b: rgbB } = hsvToRgb(angle, s, 1.0)

        const idx = (y * canvas.width + x) * 4
        data[idx] = rgbR * 255
        data[idx + 1] = rgbG * 255
        data[idx + 2] = rgbB * 255
        data[idx + 3] = 255
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

const vSelectOnFocus = {
  mounted(el) {
    el.addEventListener('focus', () => {
      el.select()
    })
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
