import { onMounted, onUnmounted } from "vue";
import { ShaderGraphEngine } from "@/rendering/shader-graph/engine";

export function useShaderEngine({
  canvasContainer,
  particleCount,
  selectedGeometry,
  customModelUrl,
  matNodes,
  matEdges,
  simNodes,
  simEdges,
  isMat
}) {
  /** @type {ShaderGraphEngine} */
  let engineInstance = null
  let isUpdating = false
  let compileTimeout = null

  const compileMaterial = () => {
    if (engineInstance) {
      engineInstance.compileMaterial(matNodes.value, matEdges.value)
    }
  }

  const compileSimulation = () => {
    if (engineInstance) {
      engineInstance.compileSimulation(simNodes.value, simEdges.value)
    }
  }

  const onGeometryChange = async () => {
    if (!engineInstance || isUpdating) return
    if (selectedGeometry.value === 'custom' && customModelUrl.value === null) return

    try {
      isUpdating = true
      await engineInstance.updateGeometry(selectedGeometry.value, customModelUrl.value)
      compileMaterial()
    } finally {
      isUpdating = false
    }
  }

  const onCustomModelUpload = (file) => {
    customModelFile.value = file
    if (customModelUrl.value) URL.revokeObjectURL(customModelUrl.value)
    customModelUrl.value = URL.createObjectURL(file)
    onGeometryChange()
  }

  const onParticleCountChange = async () => {
    if (!engineInstance || isUpdating) return

    try {
      isUpdating = true
      await engineInstance.updateParticleCount(
        particleCount.value,
        simNodes.value,
        simEdges.value,
        matNodes.value,
        matEdges.value
      )
    } finally {
      isUpdating = false
    }
  }

  const onParticleReset = async () => {
    if (!engineInstance || isUpdating) return

    try {
      isUpdating = true
      await engineInstance.resetParticleBuffers(simNodes.value, simEdges.value)
    } finally {
      isUpdating = false
    }
  }

  const onCameraReset = () => {
    if (engineInstance) {
      engineInstance.resetCamera()
    }
  }

  const onGraphResize = () => {
    if (engineInstance) {
      engineInstance.resize()
    }
  }

  const triggerCompile = () => {
    if (compileTimeout) {
      clearTimeout(compileTimeout)
    }

    compileTimeout = setTimeout(() => {
      if (isMat.value) compileMaterial()
      else compileSimulation()
    }, 50)
  }

  onMounted(() => {
    if (canvasContainer.value) {
      engineInstance = new ShaderGraphEngine();
      engineInstance.init(canvasContainer.value, {
        particleCount: particleCount.value,
        selectedGeometry: selectedGeometry.value,
        customModelUrl: customModelUrl.value
      })

      compileMaterial()
      compileSimulation()
    }
  })

  onUnmounted(() => {
    if (engineInstance) engineInstance.destroy()
  })

  return {
    compileMaterial,
    compileSimulation,
    triggerCompile,
    onGeometryChange,
    onCustomModelUpload,
    onParticleCountChange,
    onParticleReset,
    onCameraReset,
    onGraphResize
  }
}
