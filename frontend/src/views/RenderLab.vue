<template>
  <div class="w-full h-full overflow-hidden m-0 p-0 relative bg-white font-sans select-none text-gray-800">

    <div v-if="isLoading"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm text-black p-6 text-center transition-opacity duration-300">
      <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 class="text-xl font-bold mb-4 tracking-wide text-blue-600">3DGS 场景加载中...</h2>
      <div class="space-y-2 text-sm text-gray-500">
        <p>⚠️ 移动端性能受限</p>
        <p>ℹ️ 建议开启硬件加速</p>
      </div>
    </div>

    <canvas ref="canvasRef" class="block w-full h-full outline-none"></canvas>

    <router-link to="/"
      class="absolute top-4 left-4 z-[60] flex items-center justify-center w-10 h-10 bg-white/90 hover:bg-white backdrop-blur-md border border-blue-200 shadow-lg rounded-full text-blue-600 transition-all hover:scale-110 active:scale-95"
      title="返回主页">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"
        class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    </router-link>

    <div class="absolute top-4 right-4 z-40 w-80 max-h-[90vh] flex flex-col pointer-events-none">
      <div class="flex justify-end mb-2 pointer-events-auto">
        <button @click="isPanelOpen = !isPanelOpen"
          class="bg-blue-600 text-white px-3 py-1 rounded shadow-lg hover:bg-blue-500 text-sm font-bold transition-colors">
          {{ isPanelOpen ? '隐藏控制' : '显示控制' }}
        </button>
      </div>

      <div v-show="isPanelOpen"
        class="bg-white/90 backdrop-blur-md border border-blue-200 rounded-lg shadow-xl overflow-y-auto pointer-events-auto p-4 text-gray-800 custom-scrollbar">

        <h3 class="text-blue-600 font-bold border-b border-blue-100 pb-2 mb-4">场景控制台</h3>

        <div class="mb-6 space-y-2">
          <label class="text-xs font-bold text-gray-500 uppercase">选择场景</label>
          <select v-model="currentSceneUrl" @change="reloadSplats"
            class="w-full bg-gray-50 border border-gray-300 text-gray-800 text-sm rounded p-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option v-for="(url, name) in sceneList" :key="name" :value="url">{{ name }}</option>
          </select>
        </div>

        <div class="mb-6 space-y-3">
          <label class="text-xs font-bold text-gray-500 uppercase border-b border-gray-200 block pb-1">图层控制</label>
          <div class="pt-2">
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600">
                <input type="checkbox" v-model="config.showBackground" @change="updateSemantics"
                  class="accent-blue-600">
                背景
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer hover:text-blue-600">
                <input type="checkbox" v-model="config.showForeground" @change="updateSemantics"
                  class="accent-blue-600">
                前景(主体)
              </label>
            </div>
          </div>
        </div>

        <div class="mb-6 space-y-3 border border-blue-100 bg-blue-50/50 p-3 rounded-lg">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-blue-600 uppercase">雾效系统</label>
            <input type="checkbox" v-model="featureFlags.enableFog" @change="handleFogToggle"
              class="accent-blue-600 w-4 h-4 cursor-pointer">
          </div>

          <div v-if="featureFlags.enableFog" class="space-y-3 pt-2 animate-fade-in">
            <div>
              <div class="flex justify-between text-xs mb-1 text-gray-600">
                <span>密度 (Density)</span>
                <span>{{ fogConfig.density }}</span>
              </div>
              <input type="range" min="0" max="0.3" step="0.01" v-model.number="fogConfig.density"
                class="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600">
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600">颜色</span>
              <input type="color" v-model="fogConfig.color" class="bg-transparent border-none h-6 w-8 cursor-pointer">
            </div>
          </div>
        </div>

        <div class="mb-2 space-y-3 border border-blue-100 bg-blue-50/50 p-3 rounded-lg">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-blue-600 uppercase">自定义着色器 (glsl transform)</label>
            <input type="checkbox" v-model="featureFlags.enableShader" @change="reloadSplats"
              class="accent-blue-600 w-4 h-4 cursor-pointer">
          </div>

          <div v-if="featureFlags.enableShader" class="space-y-3 pt-2 animate-fade-in">

            <div>
              <label class="text-xs text-gray-500 font-bold uppercase mb-1 block">加载预设</label>
              <select v-model="selectedPreset" @change="applyPreset"
                class="w-full bg-white border border-blue-200 text-gray-700 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option v-for="(code, name) in shaderPresets" :key="name" :value="name">{{ name }}</option>
              </select>
            </div>

            <textarea v-model="shaderConfig.code"
              class="w-full h-48 bg-gray-800 text-green-400 text-xs font-mono p-2 rounded border border-gray-300 focus:border-blue-500 outline-none resize-y shadow-inner"
              spellcheck="false" placeholder="在此输入 GLSL 代码..."></textarea>

            <button @click="applyShader"
              class="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded transition-colors shadow-sm flex items-center justify-center gap-2">
              <span>应用并重载</span>
            </button>

            <p class="text-xs text-gray-400 text-center">修改代码后需点击应用</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, reactive, watch } from 'vue';
import { WebGLRenderer, PerspectiveCamera, Scene, FogExp2, Color, Uniform } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LumaSplatsSemantics, LumaSplatsThree } from '@lumaai/luma-web';

// 场景列表
const sceneList = {
  '蒲公英': 'https://lumalabs.ai/capture/d80d4876-cf71-4b8a-8b5b-49ffac44cd4a',
  '好莱坞': 'https://lumalabs.ai/capture/b5faf515-7932-4000-ab23-959fc43f0d94',
  '小镇': 'https://lumalabs.ai/capture/da82625c-9c8d-4d05-a9f7-3367ecab438c',
  '雪山': 'https://lumalabs.ai/capture/4da7cf32-865a-4515-8cb9-9dfc574c90c2',
  '雕像': 'https://lumalabs.ai/capture/1b5f3e33-3900-4398-8795-b585ae13fd2d',
  '街道': 'https://lumalabs.ai/capture/ca9ea966-ca24-4ec1-ab0f-af665cb546ff'
};

// Shader 预设定义
const shaderPresets = {
  '波浪': `(vec3 position, uint layersBitmask) {
  float y = sin(position.x * 1.0 + time_s) * 0.2;
  return mat4(
    1., 0., 0., 0,
    0., 1., 0., 0,
    0., 0., 1., 0,
    0., y,  0., 1.
  );
}`,
  '流动': `(vec3 position, uint layersBitmask) {
  float y = sin(position.x + time_s) * 0.15 + sin(position.z * 0.8 + time_s) * 0.1;
  return mat4(
    1., 0., 0., 0.,
    0., 1., 0., 0.,
    0., 0., 1., 0.,
    0., y, 0., 1.
  );
}`,
  '弯曲': `(vec3 position, uint layersBitmask) {
  float distSq = dot(position.xz, position.xz);
  float bendFactor = -0.05;
  float y_drop = distSq * bendFactor;
  return mat4(
    1., 0., 0., 0.,
    0., 1., 0., 0.,
    0., 0., 1., 0.,
    0., y_drop, 0., 1.
  );
}`,
  '扫描': `(vec3 position, uint layersBitmask) {
  float scanline = sin(position.y * 20.0 - time_s * 5.0);
  float glitch = step(0.95, scanline) * 0.2;
  float wave = sin(position.y * 2.0 + time_s) * 0.05;
  return mat4(
    1., 0., 0., 0.,
    0., 1., 0., 0.,
    0., 0., 1., 0.,
    glitch + wave, 0., 0., 1.
  );
}`
};

const canvasRef = ref(null);
const isLoading = ref(true);
const isPanelOpen = ref(true);
const currentSceneUrl = ref(sceneList['蒲公英']);
const selectedPreset = ref('波浪');

const config = reactive({
  showBackground: true,
  showForeground: true,
});

const featureFlags = reactive({
  enableFog: false,
  enableShader: false,
});

const fogConfig = reactive({
  color: '#ffffff',
  density: 0.05
});

const shaderConfig = reactive({
  code: shaderPresets['波浪']
});

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let splats = null;
let uniformTime = new Uniform(0);

const initScene = () => {
  if (!canvasRef.value) return;

  renderer = new WebGLRenderer({
    canvas: canvasRef.value,
    antialias: false,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0xffffff, 1);

  scene = new Scene();
  scene.background = new Color(0xffffff);

  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2;

  controls = new OrbitControls(camera, canvasRef.value);
  controls.enableDamping = true;

  loadSplats();

  renderer.setAnimationLoop(() => {
    if (!renderer) return;
    uniformTime.value = performance.now() / 1000;
    controls.update();
    renderer.render(scene, camera);
  });
};

const loadSplats = () => {
  isLoading.value = true;

  if (splats) {
    scene.remove(splats);
    splats.dispose();
    splats = null;
  }

  const needsIntegration = featureFlags.enableShader || featureFlags.enableFog;

  const splatOptions = {
    source: currentSceneUrl.value,
    loadingAnimationEnabled: false,
    particleRevealEnabled: false,
    enableThreeShaderIntegration: needsIntegration,
    onBeforeRender: () => {
      if (needsIntegration) {
        uniformTime.value = performance.now() / 1000;
      }
    }
  };

  splats = new LumaSplatsThree(splatOptions);

  if (featureFlags.enableShader) {
    try {
      splats.setShaderHooks({
        vertexShaderHooks: {
          additionalUniforms: {
            time_s: ['float', uniformTime],
          },
          getSplatTransform: shaderConfig.code
        }
      });
    } catch (e) {
      console.error("Shader error:", e);
    }
  }

  splats.onLoad = () => {
    console.log("Model Loaded");
    isLoading.value = false;
    updateSemantics();
    updateFogState();
  };

  splats.onInitialCameraTransform = (transform) => {
    camera.matrix.copy(transform);
    camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
    camera.updateMatrixWorld();
  };

  scene.add(splats);
};

const updateSemantics = () => {
  if (!splats) return;
  let mask = 0;
  if (config.showBackground) mask |= LumaSplatsSemantics.BACKGROUND;
  if (config.showForeground) mask |= LumaSplatsSemantics.FOREGROUND;
  splats.semanticsMask = mask;
};

const handleFogToggle = () => {
  reloadSplats();
};

const updateFogState = () => {
  if (featureFlags.enableFog) {
    const color = new Color(fogConfig.color);
    scene.fog = new FogExp2(color, fogConfig.density);
    scene.background = color;
  } else {
    scene.fog = null;
    scene.background = new Color(0xffffff);
  }
};

watch(() => fogConfig.density, (newVal) => {
  if (scene && scene.fog) scene.fog.density = newVal;
});
watch(() => fogConfig.color, (newVal) => {
  if (scene) {
    const c = new Color(newVal);
    if (scene.fog) scene.fog.color = c;
    scene.background = c;
  }
});

const applyPreset = () => {
  shaderConfig.code = shaderPresets[selectedPreset.value];
  if (featureFlags.enableShader) {
    reloadSplats();
  }
};

const applyShader = () => {
  if (!featureFlags.enableShader) return;
  reloadSplats();
};

const reloadSplats = () => {
  loadSplats();
};

const onWindowResize = () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
};

onMounted(() => {
  initScene();
  window.addEventListener('resize', onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
  if (splats) splats.dispose();
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #93c5fd;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3b82f6;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
