import { ref } from 'vue'

export function useLoadingProgress() {
  const isLoading = ref(false)
  const loadingProgress = ref(0)
  const targetProgress = ref(0)
  let animationFrameId = null

  const animateProgress = () => {
    if (loadingProgress.value < targetProgress.value) {
      const diff = targetProgress.value - loadingProgress.value
      const step = Math.max(1, diff * 0.1)
      loadingProgress.value = Math.min(targetProgress.value, Math.ceil(loadingProgress.value + step))
    }
    animationFrameId = requestAnimationFrame(animateProgress)
  }

  const startProgressAnimation = () => {
    stopProgressAnimation()
    loadingProgress.value = 0
    targetProgress.value = 0
    animationFrameId = requestAnimationFrame(animateProgress)
  }

  const stopProgressAnimation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  const waitProgressComplete = (delay = 200, checkCancel = null) => {
    return new Promise((resolve) => {
      const checkProgress = () => {
        if (checkCancel && checkCancel()) {
          resolve()
          return
        }
        if (!isLoading.value) {
          resolve()
          return
        }
        if (loadingProgress.value >= 100) {
          setTimeout(() => {
            if (checkCancel && checkCancel()) {
              resolve()
              return
            }
            if (isLoading.value) {
              isLoading.value = false
              stopProgressAnimation()
            }
            resolve()
          }, delay)
        } else {
          requestAnimationFrame(checkProgress)
        }
      }
      checkProgress()
    })
  }

  return {
    isLoading,
    loadingProgress,
    targetProgress,
    startProgressAnimation,
    stopProgressAnimation,
    waitProgressComplete
  }
}
