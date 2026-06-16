import { ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { createNode } from '../utils/nodeFactory'

export function useNodeSearch({ canvasRef, nodes }) {
  const { project } = useVueFlow()

  const searchMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    projectedX: 0,
    projectedY: 0
  })

  const openSearchMenu = (mousePos) => {
    if (!canvasRef.value || !mousePos) return

    const canvasRect = canvasRef.value.getBoundingClientRect()
    const clientX = mousePos.clientX
    const clientY = mousePos.clientY

    if (clientX < canvasRect.left || clientX > canvasRect.right
      || clientY < canvasRect.top || clientY > canvasRect.bottom) {
      return
    }

    const menuX = clientX - canvasRect.left
    const menuY = clientY - canvasRect.top
    const projected = project({ x: menuX, y: menuY })

    searchMenu.value = {
      visible: true,
      x: menuX,
      y: menuY,
      projectedX: projected.x,
      projectedY: projected.y
    }
  }

  const closeSearchMenu = () => {
    searchMenu.value.visible = false
  }

  const spawnNode = (type) => {
    const newNode = createNode(type, {
      x: searchMenu.value.projectedX,
      y: searchMenu.value.projectedY
    })

    if (newNode) {
      nodes.value.push(newNode)
    }
    closeSearchMenu()
  }

  return {
    searchMenu,
    openSearchMenu,
    closeSearchMenu,
    spawnNode
  }
}
