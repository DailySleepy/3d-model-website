import { ref } from 'vue'

export function useGraphResize(workspaceRef, graphWidth, onResizeCallback) {
  const isResizing = ref(false)

  const startResizing = () => {
    isResizing.value = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e) => {
    if (!isResizing.value || !workspaceRef.value) return

    const workspaceRect = workspaceRef.value.getBoundingClientRect()
    let newWidth = e.clientX - workspaceRect.left

    const minWidth = 250
    const maxWidth = workspaceRect.width - minWidth
    if (newWidth < minWidth) newWidth = minWidth
    if (newWidth > maxWidth) newWidth = maxWidth

    graphWidth.value = newWidth

    if (typeof onResizeCallback === 'function') onResizeCallback()
  }

  const stopResizing = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    if (typeof onResizeCallback === 'function') onResizeCallback()
  }

  return {
    workspaceRef,
    graphWidth,
    isResizing,
    startResizing
  }
 }
