import * as tsl from 'three/tsl'
import * as THREE from 'three/webgpu'

export const TYPE_METADATA_REGISTRY = {
  'float': { dim: 1, wgslType: 'f32' },
  'int': { dim: 1, wgslType: 'i32' },
  'bool': { dim: 1, wgslType: 'bool' },
  'vec2': { dim: 2, wgslType: 'vec2<f32>' },
  'vec3': { dim: 3, wgslType: 'vec3<f32>' },
  'vec4': { dim: 4, wgslType: 'vec4<f32>' },
}

export const SEMANTIC_TO_DATA_TYPE = {
  // Basic data types
  'float': 'float',
  'int': 'int',
  'bool': 'bool',
  'vec2': 'vec2',
  'vec3': 'vec3',
  'vec4': 'vec4',

  // Semantic types
  'color': 'vec3',
  'materialColor': 'vec3',
  'materialRoughness': 'float',
  'materialMetalness': 'float',
  'materialEmissive': 'vec3',
  'materialNormal': 'vec3',
  'materialAO': 'float',
  'positionLocal': 'vec3',
  'uv': 'vec2',
}

export const DEFAULT_NODE_CONSTRUCTORS = {
  // Basic data types
  'float': (v) => tsl.float(v ?? 0.0), // TODO: tsl.uniform
  'int': (v) => tsl.int(v ?? 0),
  'bool': (v) => tsl.bool(v ?? false),
  'vec2': (v) => tsl.vec2(...(v || [0, 0])),
  'vec3': (v) => tsl.vec3(...(v || [0, 0, 0])),
  'vec4': (v) => tsl.vec4(...(v || [0, 0, 0, 0])),

  // Semantic types
  'color': (v) => tsl.color(v ?? '#000000'),
  'uv': () => tsl.uv(),
  'materialColor': () => null,
  'materialRoughness': () => null,
  'materialMetalness': () => null,
  'materialEmissive': () => null,
  'materialNormal': () => null,
  'materialAO': () => null,
  'positionLocal': () => null,
}

export const getDimension = (type) => TYPE_METADATA_REGISTRY[SEMANTIC_TO_DATA_TYPE[type] || type]?.dim || 1
export const getWgslType = (type) => TYPE_METADATA_REGISTRY[SEMANTIC_TO_DATA_TYPE[type] || type]?.wgslType || 'f32'

export function getSocketDefaultResult(vueNode, socketId, registry) {
  const nodeProps = vueNode.data?.properties || {}

  const nodeConfig = registry?.[vueNode.type]
  const socketConfig = nodeConfig?.inputs?.find((input) => input.id === socketId)

  if (!socketConfig) {
    console.warn('Unexpected')
    return { node: tsl.float(0.0), type: 'float' }
  }

  const type =
    typeof socketConfig.defaultType === 'function'
      ? socketConfig.defaultType(nodeProps)
      : socketConfig.defaultType

  // 转换成基础类型返回，给编译器使用
  const dataType = SEMANTIC_TO_DATA_TYPE[type] || type

  // 优先从节点实例的 inputs 字段获取当前输入值/滑块值
  let value = vueNode.data?.inputs?.[socketId]
  // 否则读取配置默认值
  if (value === undefined) {
    value =
      typeof socketConfig.defaultValue === 'function'
        ? socketConfig.defaultValue(nodeProps)
        : socketConfig.defaultValue
  }

  const constructor = DEFAULT_NODE_CONSTRUCTORS[type]
  let node = null
  if (constructor) {
    node = typeof constructor === 'function' ? constructor(value) : constructor
  } else {
    console.warn('Unexpected')
    node = tsl.float(0.0)
  }

  return { node, type: dataType }
}

let defaultTexture = null
export function getDefaultTexture() {
  if (defaultTexture) return defaultTexture
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1, 1)
  defaultTexture = new THREE.CanvasTexture(canvas)
  return defaultTexture
}
