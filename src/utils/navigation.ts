import { useState, useEffect } from "react"

/**
 * Navigate to an internal route using History API and popstate trigger.
 */
export function navigateTo(url: string) {
  if (typeof window !== "undefined") {
    if (window.location.pathname !== url) {
      window.history.pushState({}, "", url)
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }
}

/**
 * Hook to reactively track the current window.location.pathname.
 */
export function useCurrentPath(): string {
  const [path, setPath] = useState(typeof window !== "undefined" ? window.location.pathname : "/")

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  return path
}
