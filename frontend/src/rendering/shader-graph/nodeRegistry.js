import * as tsl from 'three/tsl'

// --- Utils ---
export const TYPE_METADATA_REGISTRY = {
  'float':         { dim: 1, wgslType: 'f32'       },
  'int':           { dim: 1, wgslType: 'i32'       },
  'bool':          { dim: 1, wgslType: 'bool'      },
  'vec2':          { dim: 2, wgslType: 'vec2<f32>' },
  'vec3':          { dim: 3, wgslType: 'vec3<f32>' },
  'vec4':          { dim: 4, wgslType: 'vec4<f32>' }
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

export function getSocketDefaultResult(vueNode, socketId) {
  const nodeProps = vueNode.data?.properties || {}

  const nodeConfig = nodeRegistry[vueNode.type]
  const socketConfig = nodeConfig?.inputs?.find(input => input.id === socketId)

  if (!socketConfig) {
    console.warn('Unexpected')
    return { node: tsl.float(0.0), type: 'float' }
  }

  const type = typeof socketConfig.defaultType === 'function' ? socketConfig.defaultType(nodeProps) : socketConfig.defaultType

  // 转换成基础类型返回，给编译器使用
  const dataType = SEMANTIC_TO_DATA_TYPE[type] || type

  // 优先从节点实例的 inputs 字段获取当前输入值/滑块值
  let value = vueNode.data?.inputs?.[socketId]
  // 否则读取配置默认值
  if (value === undefined) {
    value = typeof socketConfig.defaultValue === 'function' ? socketConfig.defaultValue(nodeProps) : socketConfig.defaultValue
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

// --- Output Nodes ---
export const outputNodes = {
  'mat-output': {
    label: '材质输出 (mat-output)',
    category: 'OUTPUT',
    inputs: [
      { id: 'in-color',     defaultType: 'materialColor' },
      { id: 'in-roughness', defaultType: 'materialRoughness' },
      { id: 'in-metalness', defaultType: 'materialMetalness' },
      { id: 'in-emissive',  defaultType: 'materialEmissive' },
      { id: 'in-ao',        defaultType: 'materialAO' },
      { id: 'in-normal',    defaultType: 'materialNormal' },
      { id: 'in-position',  defaultType: 'positionLocal' }
    ],
    outputs: [],
    inferType() { return 'void' },
    compile() { return null }
  },
  'sim-output': {
    label: '粒子物理输出 (sim-output)',
    category: 'OUTPUT',
    inputs: [
      { id: 'init-position', defaultType: 'vec3',  defaultValue: [0.0, 0.0, 0.0] },
      { id: 'init-velocity', defaultType: 'vec3',  defaultValue: [0.0, 0.0, 0.0] },
      { id: 'velocity',      defaultType: 'vec3',  defaultValue: [0.0, 0.0, 0.0] },
      { id: 'force',         defaultType: 'vec3',  defaultValue: [0.0, 0.0, 0.0] }
    ],
    outputs: [],
    inferType() { return 'void' },
    compile() { return null }
  }
}

// --- Constant Nodes ---
export const constantNodes = {
  'float': {
    label: '浮点数 (float)',
    category: 'CONSTANT',
    properties: {
      value: {
        type: 'float',
        default: 0.0,
        label: '数值'
      }
    },
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'float' }
    ],
    inferType() { return 'float' },
    compile: ({ nodeProps }) => tsl.float(nodeProps?.value ?? 0.0)
  },
  'integer': {
    label: '整数 (integer)',
    category: 'CONSTANT',
    properties: {
      value: {
        type: 'int',
        default: 0,
        label: '数值'
      }
    },
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'int' }
    ],
    inferType() { return 'int' },
    compile: ({ nodeProps }) => tsl.int(nodeProps?.value ?? 0)
  },
  'color': {
    label: '颜色 (color)',
    category: 'CONSTANT',
    properties: {
      value: {
        type: 'color',
        default: '#ff5395',
        label: '颜色'
      }
    },
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'color' }
    ],
    inferType() { return 'vec3' },
    compile: ({ nodeProps }) => tsl.color(nodeProps?.value ?? '#ff5395')
  },
} // TODO: 向量, 整数, bool, 旋转(欧拉角)

// --- Geometry Nodes ---
export const geometryNodes = {
  'positionLocal': {
    label: '局部空间坐标 (positionLocal)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: () => tsl.positionLocal
  },
  'normalWorld': {
    label: '世界空间法线 (normalWorld)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: () => tsl.normalWorld
  },
  'normalLocal': {
    label: '局部空间法线 (normalLocal)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: () => tsl.normalLocal
  },
  'uv': {
    label: '纹理坐标 (uv)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec2' }
    ],
    inferType() { return 'vec2' },
    compile: () => tsl.uv()
  },
  'time': {
    label: '时间 (time)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'float' }
    ],
    inferType() { return 'float' },
    compile: ({ uniforms }) => uniforms.time || tsl.timerLocal()
  },
  'lightDir': {
    label: '光源方向 (lightDir)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: ({ uniforms }) => uniforms.lightDir
  },
  'viewDir': {
    label: '视线方向 (viewDir)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: () => tsl.cameraPosition.sub(tsl.positionWorld).normalize()
  },
  'instanceIndex': {
    label: '实例索引 (instanceIndex)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'float' }
    ],
    inferType() { return 'float' },
    compile: () => tsl.float(tsl.instanceIndex)
  },
  'originalMaterial': {
    label: '原始材质 (originalMaterial)',
    category: 'GEOMETRY',
    inputs: [],
    outputs: [
      { id: 'out-color',     defaultType: 'materialColor' },
      { id: 'out-roughness', defaultType: 'materialRoughness' },
      { id: 'out-metalness', defaultType: 'materialMetalness' },
      { id: 'out-emissive',  defaultType: 'materialEmissive' },
      { id: 'out-normal',    defaultType: 'materialNormal' },
      { id: 'out-ao',        defaultType: 'materialAO' }
    ],
    inferType({ outputSocketId }) {
      switch (outputSocketId) {
        case 'out-roughness':
        case 'out-metalness':
        case 'out-ao':
          return 'float'
        default:
          return 'vec3'
      }
    },
    compile: ({ outputSocketId }) => {
      switch (outputSocketId) {
        case 'out-color': return tsl.materialColor
        case 'out-roughness': return tsl.materialRoughness
        case 'out-metalness': return tsl.materialMetalness
        case 'out-emissive': return tsl.materialEmissive
        case 'out-normal': return tsl.materialNormal
        case 'out-ao': return tsl.materialAO
        default: return tsl.materialColor
      }
    }
  },
  // TODO: 物体的特定 Mesh
}

// --- Vector Nodes ---
export const vectorNodes = {
  'combineVec3': {
    label: '合并三维向量 (combineVec3)',
    category: 'VECTOR',
    inputs: [
      { id: 'in-x', defaultType: 'float', defaultValue: 0.0 },
      { id: 'in-y', defaultType: 'float', defaultValue: 0.0 },
      { id: 'in-z', defaultType: 'float', defaultValue: 0.0 }
    ],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType() { return 'vec3' },
    compile: ({ inputs }) => tsl.vec3(inputs.compiledNode('in-x'), inputs.compiledNode('in-y'), inputs.compiledNode('in-z'))
  },
  'splitVec3': {
    label: '分解三维向量 (splitVec3)',
    category: 'VECTOR',
    inputs: [
      { id: 'in', defaultType: 'vec3', defaultValue: [0.0, 0.0, 0.0] }
    ],
    outputs: [
      { id: 'out-x', defaultType: 'float' },
      { id: 'out-y', defaultType: 'float' },
      { id: 'out-z', defaultType: 'float' }
    ],
    inferType() { return 'float' },
    compile: ({ inputs, outputSocketId }) => {
      const inputVec3 = inputs.compiledNode('in')
      switch (outputSocketId) {
        case 'out-x': return inputVec3.x
        case 'out-y': return inputVec3.y
        case 'out-z': return inputVec3.z
        default: return inputVec3.x
      }
    }
  },
  'append': {
    label: '拼接向量 (append)',
    category: 'VECTOR',
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [
      { id: 'out', defaultType: 'vec3', isDynamic: true }
    ],
    inferType({ inputs }) {
      const dimA = getDimension(inputs.type('in-a'))
      const dimB = getDimension(inputs.type('in-b'))
      const total = dimA + dimB
      switch (total) {
        case 2: return 'vec2'
        case 3: return 'vec3'
        case 4: return 'vec4'
        default: return 'vec3'
      }
    },
    compile({ inputs }) {
      const a = inputs.compiledNode('in-a')
      const b = inputs.compiledNode('in-b')
      switch (this.inferType({ inputs })) {
        case 'vec2': return tsl.vec2(a, b)
        case 'vec3': return tsl.vec3(a, b)
        case 'vec4': return tsl.vec4(a, b)
        default: return tsl.vec3(a, b)
      }
    }
  },
} // TODO: length, normalize

// --- Math Nodes ---
export const mathNodes = {
  'sin': {
    label: '正弦 (sin)',
    category: 'MATH',
    inputs: [{ id: 'in', defaultType: 'float', defaultValue: 0.0, isDynamic: true }],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in') },
    compile: ({ inputs }) => tsl.sin(inputs.compiledNode('in'))
  },
  'cos': {
    label: '余弦 (cos)',
    category: 'MATH',
    inputs: [{ id: 'in', defaultType: 'float', defaultValue: 0.0, isDynamic: true }],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in') },
    compile: ({ inputs }) => tsl.cos(inputs.compiledNode('in'))
  },
  'abs': {
    label: '绝对值 (abs)',
    category: 'MATH',
    inputs: [{ id: 'in', defaultType: 'float', defaultValue: 0.0, isDynamic: true }],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in') },
    compile: ({ inputs }) => tsl.abs(inputs.compiledNode('in'))
  },
  'frac': {
    label: '取小数部分 (frac)',
    category: 'MATH',
    inputs: [{ id: 'in', defaultType: 'float', defaultValue: 0.0, isDynamic: true }],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in') },
    compile: ({ inputs }) => tsl.fract(inputs.compiledNode('in'))
  },
  'add': {
    label: '加法 (add)',
    category: 'MATH',
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-a') }, // TODO: return typeof max dim (a, b)
    compile: ({ inputs }) => tsl.add(inputs.compiledNode('in-a'), inputs.compiledNode('in-b')) // TODO: assert dim a == dim b || any(dim a, dim b) == 1
  },
  'sub': {
    label: '减法 (sub)',
    category: 'MATH',
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-a') },
    compile: ({ inputs }) => tsl.sub(inputs.compiledNode('in-a'), inputs.compiledNode('in-b'))
  },
  'mul': {
    label: '乘法 (mul)',
    category: 'MATH',
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 1.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 1.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-a') },
    compile: ({ inputs }) => tsl.mul(inputs.compiledNode('in-a'), inputs.compiledNode('in-b'))
  },
  'div': {
    label: '除法 (div)',
    category: 'MATH',
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 1.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 1.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-a') },
    compile: ({ inputs }) => tsl.div(inputs.compiledNode('in-a'), inputs.compiledNode('in-b'))
  },
  'power': {
    label: '幂 (power)',
    category: 'MATH',
    inputs: [
      { id: 'in-base',     defaultType: 'float', defaultValue: 2.0, isDynamic: true },
      { id: 'in-exponent', defaultType: 'float', defaultValue: 3.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-base') },
    compile: ({ inputs }) => tsl.pow(inputs.compiledNode('in-base'), inputs.compiledNode('in-exponent'))
  },
}

// --- Advanced Nodes ---
export const advancedNodes = {
  'clamp': {
    label: '区间限制 (clamp)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-x',   defaultType: 'float', defaultValue: 0.5, isDynamic: true },
      { id: 'in-min', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-max', defaultType: 'float', defaultValue: 1.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-x') },
    compile: ({ inputs }) => tsl.clamp(inputs.compiledNode('in-x'), inputs.compiledNode('in-min'), inputs.compiledNode('in-max'))
  },
  'step': {
    label: '阶梯步进 (step)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-edge', defaultType: 'float', defaultValue: 0.5, isDynamic: true },
      { id: 'in-x',    defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-x') },
    compile: ({ inputs }) => tsl.step(inputs.compiledNode('in-edge'), inputs.compiledNode('in-x'))
  },
  'smoothstep': {
    label: '平滑步进 (smoothstep)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-edge0', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-edge1', defaultType: 'float', defaultValue: 1.0, isDynamic: true },
      { id: 'in-x',     defaultType: 'float', defaultValue: 0.5, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-x') },
    compile: ({ inputs }) => tsl.smoothstep(inputs.compiledNode('in-edge0'), inputs.compiledNode('in-edge1'), inputs.compiledNode('in-x'))
  },
  'mapRange': {
    label: '区间映射 (mapRange)',
    category: 'ADVANCED',
    properties: {
      mode: {
        options: ['linear', 'linearClamped', 'smoothstep'],
        default: 'linear',
        label: '映射模式'
      }
    },
    inputs: [
      { id: 'in-x',    defaultType: 'float', defaultValue: 0.5, isDynamic: true },
      { id: 'in-min',  defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-max',  defaultType: 'float', defaultValue: 1.0, isDynamic: true },
      { id: 'out-min', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'out-max', defaultType: 'float', defaultValue: 1.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-x') },
    compile({ nodeProps, inputs }) {
      const x = inputs.compiledNode('in-x')
      const inMin = inputs.compiledNode('in-min')
      const inMax = inputs.compiledNode('in-max')
      const outMin = inputs.compiledNode('out-min')
      const outMax = inputs.compiledNode('out-max')

      let t = x.sub(inMin).div(inMax.sub(inMin))
      const mode = nodeProps?.mode || 'linear'
      if (mode === 'linearClamped') {
        t = tsl.clamp(t, tsl.float(0.0), tsl.float(1.0))
      } else if (mode === 'smoothstep') {
        t = tsl.smoothstep(inMin, inMax, x)
      }
      return outMin.add(t.mul(outMax.sub(outMin)))
    }
  },
  'transform': {
    label: '空间变换 (transform)',
    category: 'ADVANCED',
    properties: {
      from: {
        options: ['local', 'world', 'view'],
        default: 'local',
        label: '源空间'
      },
      to: {
        options: ['local', 'world', 'view'],
        default: 'world',
        label: '目标空间'
      },
      transformType: {
        options: ['point', 'direction'],
        default: 'point',
        label: '变换类型'
      }
    },
    inputs: [
      { id: 'in-vector', defaultType: 'vec3', defaultValue: [0.0, 0.0, 0.0] }
    ],
    outputs: [{ id: 'out', defaultType: 'vec3' }],
    inferType() { return 'vec3' },
    compile({ nodeProps, inputs }) {
      const vec = inputs.compiledNode('in-vector')
      const from = nodeProps?.from || 'local'
      const to = nodeProps?.to || 'world'
      const transformType = nodeProps?.transformType || 'point'
      if (from === to) return vec

      let matrix = null
      if (from === 'local' && to === 'world') matrix = tsl.modelWorldMatrix
      else if (from === 'world' && to === 'local') matrix = tsl.modelWorldMatrix.invert()
      else if (from === 'world' && to === 'view') matrix = tsl.cameraViewMatrix
      else if (from === 'view' && to === 'world') matrix = tsl.cameraViewMatrix.invert()
      else if (from === 'local' && to === 'view') matrix = tsl.modelViewMatrix
      else if (from === 'view' && to === 'local') matrix = tsl.modelViewMatrix.invert()

      if (matrix) {
        if (transformType === 'direction') return matrix.transformDirection(vec)
        return matrix.mul(tsl.vec4(vec, 1.0)).xyz
      }
      return vec
    }
  },
  'dot': {
    label: '点积 (dot)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-a', defaultType: 'vec3', defaultValue: [0.0, 0.0, 0.0], isDynamic: true },
      { id: 'in-b', defaultType: 'vec3', defaultValue: [0.0, 0.0, 0.0], isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float' }],
    inferType() { return 'float' },
    compile: ({ inputs }) => tsl.dot(inputs.compiledNode('in-a'), inputs.compiledNode('in-b'))
  },
  'cross': {
    label: '向量叉积 (cross)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-a', defaultType: 'vec3', defaultValue: [1.0, 0.0, 0.0] },
      { id: 'in-b', defaultType: 'vec3', defaultValue: [0.0, 1.0, 0.0] }
    ],
    outputs: [{ id: 'out', defaultType: 'vec3' }],
    inferType() { return 'vec3' },
    compile: ({ inputs }) => tsl.cross(inputs.compiledNode('in-a'), inputs.compiledNode('in-b'))
  },
  'compare': {
    label: '条件比较 (compare)',
    category: 'ADVANCED',
    properties: {
      op: {
        options: ['==', '!=', '<', '<=', '>', '>='],
        default: '==',
        label: '比较符'
      }
    },
    inputs: [
      { id: 'in-a', defaultType: 'float', defaultValue: 0.0, isDynamic: true },
      { id: 'in-b', defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float' }],
    inferType() { return 'float' },
    compile({ nodeProps, inputs }) {
      const a = inputs.compiledNode('in-a')
      const b = inputs.compiledNode('in-b')
      const op = nodeProps?.op || '=='
      let cond = null
      if (op === '==') cond = a.equal(b)
      else if (op === '!=') cond = a.notEqual(b)
      else if (op === '<') cond = a.lessThan(b)
      else if (op === '<=') cond = a.lessThanEqual(b)
      else if (op === '>') cond = a.greaterThan(b)
      else if (op === '>=') cond = a.greaterThanEqual(b)
      return cond ? cond.select(tsl.float(1.0), tsl.float(0.0)) : tsl.float(0.0)
    }
  },
  'select': {
    label: '三元选择 (select)',
    category: 'ADVANCED',
    inputs: [
      { id: 'in-cond',  defaultType: 'float', defaultValue: 1.0 },
      { id: 'in-true',  defaultType: 'float', defaultValue: 1.0, isDynamic: true },
      { id: 'in-false', defaultType: 'float', defaultValue: 0.0, isDynamic: true }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ inputs }) { return inputs.type('in-true') },
    compile: ({ inputs }) => inputs.compiledNode('in-cond').greaterThan(tsl.float(0.5)).select(inputs.compiledNode('in-true'), inputs.compiledNode('in-false'))
  },
  'random': {
    label: '随机数 (random)',
    category: 'ADVANCED',
    properties: {
      randomType: {
        options: ['float', 'int', 'bool', 'vec2', 'vec3', 'vec4'],
        default: 'float',
        label: '随机类型'
      }
    },
    inputs: [
      { id: 'in-seed', defaultType: 'float', defaultValue: 0.0 },
      { id: 'in-prob', defaultType: 'float', defaultValue: 0.5 },
      {
        id: 'in-min',
        defaultType: (nodeProps) => nodeProps?.randomType || 'float',
        defaultValue: (nodeProps) => {
          const type = nodeProps?.randomType || 'float'
          if (type === 'vec2') return [0.0, 0.0]
          if (type === 'vec3') return [0.0, 0.0, 0.0]
          if (type === 'vec4') return [0.0, 0.0, 0.0, 0.0]
          return 0.0
        },
        isDynamic: true
      },
      {
        id: 'in-max',
        defaultType: (nodeProps) => nodeProps?.randomType || 'float',
        defaultValue: (nodeProps) => {
          const type = nodeProps?.randomType || 'float'
          if (type === 'vec2') return [1.0, 1.0]
          if (type === 'vec3') return [1.0, 1.0, 1.0]
          if (type === 'vec4') return [1.0, 1.0, 1.0, 1.0]
          if (type === 'int')  return 100.0
          return 1.0
        },
        isDynamic: true
      }
    ],
    outputs: [{ id: 'out', defaultType: 'float', isDynamic: true }],
    inferType({ nodeProps }) {
      return nodeProps?.randomType || 'float'
    },
    compile({ nodeProps, inputs }) {
      const seed = inputs.compiledNode('in-seed')
      const randomType = this.inferType({ nodeProps })

      if (randomType === 'bool') {
        return tsl.hash(seed).lessThan(inputs.compiledNode('in-prob')).select(tsl.float(1.0), tsl.float(0.0))
      }

      const min = inputs.compiledNode('in-min')
      const max = inputs.compiledNode('in-max')
      const range = max.sub(min)

      if (randomType === 'vec2') {
        const h1 = tsl.hash(seed), h2 = tsl.hash(seed.add(tsl.float(1.0)))
        return min.add(tsl.vec2(h1, h2).mul(range))
      }
      if (randomType === 'vec3') {
        const h1 = tsl.hash(seed), h2 = tsl.hash(seed.add(tsl.float(1.0))), h3 = tsl.hash(seed.add(tsl.float(2.0)))
        return min.add(tsl.vec3(h1, h2, h3).mul(range))
      }
      if (randomType === 'vec4') {
        const h1 = tsl.hash(seed), h2 = tsl.hash(seed.add(tsl.float(1.0))), h3 = tsl.hash(seed.add(tsl.float(2.0))), h4 = tsl.hash(seed.add(tsl.float(3.0)))
        return min.add(tsl.vec4(h1, h2, h3, h4).mul(range))
      }
      if (randomType === 'int') {
        return min.add(tsl.hash(seed).mul(range)).toInt()
      }
      // float
      return min.add(tsl.hash(seed).mul(range))
    }
  },
}

// --- Custom Nodes ---
export const customNodes = {
  'custom': {
    label: '自定义代码块 (custom)',
    category: 'CUSTOM',
    properties: {
      inputs: [],
      code: 'return vec3<f32>(0.0)',
      returnType: 'vec3'
    },
    inputs: [],
    outputs: [
      { id: 'out', defaultType: 'vec3' }
    ],
    inferType({ nodeProps }) {
      return nodeProps?.returnType || 'vec3'
    },
    compile({ nodeId, nodeProps, inputs }) {
      const returnType = this.inferType({ nodeProps })
      if (!nodeProps?.code) return tsl[returnType](0.0)

      const inputsList = nodeProps?.inputs || []
      const wgslParams = []
      const wgslArgs = {}

      inputsList.forEach(id => {
        const compiledNode = inputs.compiledNode(id)
        if (compiledNode) {
          const inputType = inputs.type(id)
          const wgslType = getWgslType(inputType)
          wgslParams.push(`${id} : ${wgslType}`)
          wgslArgs[id] = compiledNode
        }
      })

      const wgslReturnType = getWgslType(returnType)
      const safeId = nodeId.replace(/-/g, '_')
      const funcName = `custom_func_${safeId}`
      const wgslSource = `fn ${funcName}( ${wgslParams.join(', ')} ) -> ${wgslReturnType} { ${nodeProps?.code} }`

      try {
        return tsl.wgslFn(wgslSource)(wgslArgs)
      } catch (error) {
        console.error("WGSL compilation failed:", error, wgslSource)
        return tsl[returnType](0.0)
      }
    }
  }
}

// --- Registry ---
export const nodeRegistry = {
  ...outputNodes,
  ...constantNodes,
  ...geometryNodes,
  ...vectorNodes,
  ...mathNodes,
  ...advancedNodes,
  ...customNodes
}

export function getNodeRegistryKeys() {
  return Object.keys(nodeRegistry)
}
