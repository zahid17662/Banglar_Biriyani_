import { useEffect } from "react"

let lockCount = 0

/**
 * Custom hook to lock document.body scroll while a modal or drawer is open.
 * Uses a reference counter so nested or overlapping modals cleanly manage
 * the overflow: hidden state without prematurely unlocking body scroll.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    lockCount++
    if (lockCount === 1) {
      document.body.style.overflow = "hidden"
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = ""
      }
    }
  }, [isLocked])
}
