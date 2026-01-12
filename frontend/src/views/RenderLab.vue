<template>
  <div class="w-screen h-screen overflow-hidden m-0 p-0">
    <canvas ref="canvasRef" class="block w-full h-full outline-none"></canvas>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { WebGLRenderer, PerspectiveCamera, Scene } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LumaSplatsThree } from '@lumaai/luma-web';

const canvasRef = ref(null);

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let splat = null;

const initScene = () => {
  if (!canvasRef.value) return;

  renderer = new WebGLRenderer({
    canvas: canvasRef.value,
    antialias: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  scene = new Scene();

  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 2;

  controls = new OrbitControls(camera, canvasRef.value);
  controls.enableDamping = true;

  splat = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/d80d4876-cf71-4b8a-8b5b-49ffac44cd4a'
  });
  scene.add(splat);

  renderer.setAnimationLoop(() => {
    if (!renderer) return;

    controls.update();
    renderer.render(scene, camera);
  });
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

  if (renderer) {
    renderer.setAnimationLoop(null);
    renderer.dispose();
  }

  if (splat) {
    scene.remove(splat);
  }

  renderer = null;
  scene = null;
  camera = null;
  controls = null;
});
</script>
