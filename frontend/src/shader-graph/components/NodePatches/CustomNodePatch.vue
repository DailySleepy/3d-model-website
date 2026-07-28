<template>
  <div class="custom-patch nodrag">

    <!-- Inputs 管理 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">Inputs</span>
        <button class="btn-add" @click="toggleAddInput" title="添加输入">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          添加
        </button>
      </div>

      <!-- 添加 input 行内表单 -->
      <div v-if="showAddInput" class="add-form">
        <input
          v-model="newInputId"
          ref="newInputRef"
          type="text"
          placeholder="变量名 (e.g. uv)"
          class="id-input"
          :class="{ 'id-input--error': newInputError }"
          @keydown.enter="addInput"
          @keydown.escape="cancelAdd"
          @input="newInputError = ''"
          maxlength="32"
        />
        <span v-if="newInputError" class="error-msg">{{ newInputError }}</span>
        <div class="add-form-actions">
          <button class="btn-confirm" @click="addInput">确认</button>
          <button class="btn-cancel" @click="cancelAdd">取消</button>
        </div>
      </div>

      <!-- input 列表 -->
      <div v-if="inputs.length > 0" class="input-list">
        <div v-for="id in inputs" :key="id" class="input-row-container">
          <div class="input-row">
            <span class="input-dot" :style="{ background: theme.color }"></span>

            <template v-if="editingInputId === id">
              <input
                v-model="editingInputValue"
                ref="editInputRef"
                type="text"
                class="id-input id-input--inline"
                :class="{ 'id-input--error': editingInputError }"
                @keydown.enter="confirmRename(id)"
                @keydown.escape="cancelRename"
                @blur="confirmRename(id)"
                @input="editingInputError = ''"
                maxlength="32"
              />
            </template>
            <template v-else>
              <span class="input-id cursor-pointer" @dblclick="startRename(id)" title="双击重命名">{{ id }}</span>
              <button class="btn-icon" @click="startRename(id)" title="重命名">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M8.5 1.5l2 2L3.5 10.5H1.5v-2L8.5 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="btn-remove" @click="removeInput(id)" title="移除">
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </button>
            </template>
          </div>
          <span v-if="editingInputId === id && editingInputError" class="error-msg px-1">{{ editingInputError }}</span>
        </div>
      </div>
      <div v-else-if="!showAddInput" class="empty-hint">暂无输入端口</div>
    </div>

    <!-- 返回类型 -->
    <div class="section section--row">
      <span class="section-title">返回类型</span>
      <select class="type-select" :value="returnType" @change="e => onReturnTypeChange(e.target.value)">
        <option v-for="t in RETURN_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <!-- 函数签名提示 -->
    <div class="section section--sig">
      <span class="section-title">函数签名（只读）</span>
      <code class="sig-hint">{{ signatureHint }}</code>
    </div>

    <!-- 代码编辑区 -->
    <div class="section section--code">
      <textarea
        class="code-editor"
        v-model="localCode"
        @blur="onCodeBlur"
        :placeholder="defaultCode"
        spellcheck="false"
        rows="5"
      ></textarea>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useShaderGraphStore } from '../../stores/shaderGraph.js'
import { nodeRegistry, getWgslType, getNodeOutputs } from '@/rendering/nodeRegistry'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  theme: { type: Object, required: true }
})

const store = useShaderGraphStore()

const RETURN_TYPES = ['float', 'vec2', 'vec3', 'vec4']
const WGSL_TYPE_MAP = { float: 'f32', vec2: 'vec2<f32>', vec3: 'vec3<f32>', vec4: 'vec4<f32>' }
const ID_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

const defaultCode = nodeRegistry['custom']?.properties?.code || 'return vec3<f32>(0.0);'

const showAddInput = ref(false)
const newInputId = ref('')
const newInputError = ref('')
const newInputRef = ref(null)

const editingInputId = ref(null)
const editingInputValue = ref('')
const editingInputError = ref('')
const editInputRef = ref(null)

const localCode = ref(props.data.properties?.code ?? defaultCode)

watch(() => props.data.properties?.code, (newVal) => {
  if (newVal !== undefined && newVal !== localCode.value) {
    localCode.value = newVal
  }
})

const inputs = computed(() => props.data.properties?.inputs || [])
const returnType = computed(() => props.data.properties?.returnType || 'vec3')

const signatureHint = computed(() => {
  const retWgsl = WGSL_TYPE_MAP[returnType.value] || getWgslType(returnType.value)
  const params = inputs.value.map(id => {
    let inputWgslType = '<type>'
    const edge = store.inputEdgesLUT.get(`${props.id}_${id}`)
    if (edge) {
      const sourceNode = store.nodesLUT.get(edge.source)
      if (sourceNode) {
        const sourceConfig = nodeRegistry[sourceNode.type]
        if (sourceConfig) {
          let type = 'float'
          if (typeof sourceConfig.inferType === 'function') {
            type = sourceConfig.inferType({ nodeProps: sourceNode.data?.properties })
          } else {
            const outputs = getNodeOutputs(sourceConfig, sourceNode.data?.properties)
            const socket = outputs.find(o => o.id === edge.sourceHandle)
            if (socket) {
              type = typeof socket.defaultType === 'function'
                ? socket.defaultType(sourceNode.data?.properties || {})
                : socket.defaultType
            }
          }
          inputWgslType = getWgslType(type)
        }
      }
    }
    return `${id}: ${inputWgslType}`
  }).join(', ')
  return `fn custom(${params}) -> ${retWgsl} { ... }`
})

watch(showAddInput, async (val) => {
  if (val) {
    await nextTick()
    newInputRef.value?.focus()
  }
})

// --- 操作 ---
const updateProps = (patch) => {
  store.updateNodeData(props.id, {
    properties: { ...props.data.properties, ...patch }
  })
}

const toggleAddInput = () => {
  showAddInput.value = !showAddInput.value
  if (!showAddInput.value) {
    newInputId.value = ''
    newInputError.value = ''
  }
}

const addInput = () => {
  const id = newInputId.value.trim()
  if (!id) {
    newInputError.value = '变量名不能为空'
    return
  }
  if (!ID_REGEX.test(id)) {
    newInputError.value = '仅允许字母、数字、下划线，不以数字开头'
    return
  }
  if (inputs.value.includes(id)) {
    newInputError.value = `"${id}" 已存在`
    return
  }
  updateProps({ inputs: [...inputs.value, id] })
  cancelAdd()
}

const cancelAdd = () => {
  showAddInput.value = false
  newInputId.value = ''
  newInputError.value = ''
}

const startRename = async (id) => {
  editingInputId.value = id
  editingInputValue.value = id
  editingInputError.value = ''
  await nextTick()
  if (Array.isArray(editInputRef.value)) {
    editInputRef.value[0]?.focus()
    editInputRef.value[0]?.select()
  } else {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  }
}

const cancelRename = () => {
  editingInputId.value = null
  editingInputValue.value = ''
  editingInputError.value = ''
}

const confirmRename = (oldId) => {
  if (editingInputId.value !== oldId) return
  const newId = editingInputValue.value.trim()

  if (newId === oldId) {
    cancelRename()
    return
  }

  if (!newId) {
    editingInputError.value = '变量名不能为空'
    return
  }
  if (!ID_REGEX.test(newId)) {
    editingInputError.value = '仅允许字母、数字、下划线，不以数字开头'
    return
  }
  if (inputs.value.some(i => i !== oldId && i === newId)) {
    editingInputError.value = `"${newId}" 已存在`
    return
  }

  // 1. 迁移连线 Edge 到新的 Handle ID
  const edge = store.currentEdges.find(e => e.target === props.id && e.targetHandle === oldId)
  if (edge) {
    edge.targetHandle = newId
  }

  // 2. 更新节点属性 inputs
  const updatedInputs = inputs.value.map(i => i === oldId ? newId : i)
  updateProps({ inputs: updatedInputs })

  cancelRename()
}

const removeInput = (id) => {
  const edge = store.inputEdgesLUT.get(`${props.id}_${id}`)
  if (edge) {
    store.removeEdge(edge.id)
  }
  updateProps({ inputs: inputs.value.filter(i => i !== id) })
}

const onReturnTypeChange = (val) => {
  updateProps({ returnType: val })
}

const onCodeBlur = () => {
  if (localCode.value !== props.data.properties?.code) {
    updateProps({ code: localCode.value })
  }
}
</script>

<style scoped>
.custom-patch {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 0 4px;
  width: 240px;
  box-sizing: border-box;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.section--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.section--sig { gap: 3px; }
.section--code { padding-top: 4px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 10px;
  font-weight: 600;
  color: rgba(161,161,170,0.8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: v-bind('theme.color');
  background: transparent;
  border: 1px solid v-bind('theme.color + "66"');
  border-radius: 4px;
  padding: 1px 6px;
  cursor: pointer;
  transition: background 0.15s;
  line-height: 1.6;
}
.btn-add:hover { background: v-bind('theme.color + "22"'); }

.add-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.id-input {
  background: rgba(9,9,11,0.8);
  border: 1px solid rgba(63,63,70,0.8);
  border-radius: 5px;
  color: #e4e4e7;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 3px 7px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.id-input:focus { border-color: v-bind('theme.color'); }
.id-input--error { border-color: #ef4444 !important; }

.error-msg {
  font-size: 9px;
  color: #f87171;
  line-height: 1.3;
}

.add-form-actions {
  display: flex;
  gap: 4px;
}

.btn-confirm {
  flex: 1;
  font-size: 10px;
  padding: 2px 0;
  border-radius: 4px;
  border: 1px solid v-bind('theme.color + "99"');
  background: v-bind('theme.color + "33"');
  color: v-bind('theme.color');
  cursor: pointer;
  transition: background 0.15s;
}
.btn-confirm:hover { background: v-bind('theme.color + "55"'); }

.btn-cancel {
  flex: 1;
  font-size: 10px;
  padding: 2px 0;
  border-radius: 4px;
  border: 1px solid rgba(63,63,70,0.8);
  background: transparent;
  color: #71717a;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover { background: rgba(255,255,255,0.05); }

.input-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.input-row-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.1s;
}
.input-row:hover { background: rgba(255,255,255,0.04); }

.input-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.input-id {
  flex: 1;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #d4d4d8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-icon {
  background: transparent;
  border: none;
  color: #52525b;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}
.btn-icon:hover {
  color: #e4e4e7;
  background: rgba(255,255,255,0.08);
}

.id-input--inline {
  padding: 1px 4px;
  font-size: 10px;
  height: 20px;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #52525b;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color 0.15s, background 0.15s;
}
.btn-remove:hover {
  color: #f87171;
  background: rgba(239,68,68,0.12);
}

.empty-hint {
  font-size: 10px;
  color: #3f3f46;
  text-align: center;
  padding: 4px 0;
  font-style: italic;
}

.type-select {
  background: rgba(9,9,11,0.8);
  border: 1px solid rgba(63,63,70,0.8);
  border-radius: 5px;
  color: #e4e4e7;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 2px 6px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
.type-select:focus { border-color: v-bind('theme.color'); }

.sig-hint {
  font-size: 9.5px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #a1a1aa;
  background: rgba(9,9,11,0.5);
  border-radius: 4px;
  padding: 3px 6px;
  word-break: break-all;
  white-space: pre-wrap;
  line-height: 1.5;
  border: 1px solid rgba(39,39,42,0.8);
  max-width: 100%;
  box-sizing: border-box;
}

.code-editor {
  width: 100%;
  box-sizing: border-box;
  background: rgba(9,9,11,0.8);
  border: 1px solid rgba(63,63,70,0.7);
  border-radius: 6px;
  color: #a5f3a0;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 6px 8px;
  resize: vertical;
  outline: none;
  line-height: 1.6;
  transition: border-color 0.15s;
  min-height: 72px;
}
.code-editor:focus { border-color: v-bind('theme.color'); }
.code-editor::placeholder { color: #3f3f46; }
</style>
