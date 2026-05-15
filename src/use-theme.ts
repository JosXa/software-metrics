import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const storageKey = 'sqm.theme'

function safeStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const candidate = window.localStorage
    if (candidate === null || candidate === undefined) return undefined
    if (typeof candidate.getItem !== 'function') return undefined
    return candidate
  } catch {
    return undefined
  }
}

function safePrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function readInitialTheme(): Theme {
  const storage = safeStorage()
  const stored = storage?.getItem(storageKey)
  if (stored === 'light' || stored === 'dark') return stored
  return safePrefersDark() ? 'dark' : 'light'
}

export function useTheme(): {
  readonly theme: Theme
  readonly toggle: () => void
} {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const storage = safeStorage()
    storage?.setItem(storageKey, theme)
  }, [theme])

  return {
    theme,
    toggle: () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
  }
}
