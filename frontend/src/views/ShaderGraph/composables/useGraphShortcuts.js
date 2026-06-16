import { onMounted, onUnmounted, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { nodeRegistry } from '@/rendering/shader-graph/nodeRegistry.js'

export function useGraphShortCuts({ canvasRef, nodes, openSearchMenu }) {
  const mousePos = {}

  const trackMousePos = (e) => {
    mousePos.clientX = e.clientX
    mousePos.clientY = e.clientY
  }

  const handleGlobalKeyDown = (e) => {
    if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault()
      openSearchMenu(mousePos)
      return
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', trackMousePos)
    window.addEventListener('keydown', handleGlobalKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', trackMousePos)
    window.removeEventListener('keydown', handleGlobalKeyDown)
  })
}
