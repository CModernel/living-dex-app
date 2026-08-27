import { useCallback, useEffect } from 'react'
import { useUserState } from '../state/UserStateContext'

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Persisted as `preferences.darkMode` (3.5) — previously an in-memory `useState` that
 * reset to the OS preference on every reload. The stored type allows a future 'system'
 * tri-state picker (see the "Selectable theme system" idea in TODO.md), but this hook
 * stays toggle-only for now, matching Layout.tsx's single button: toggling always
 * commits an explicit 'light'/'dark' choice, moving away from 'system' the first time
 * the user interacts with it.
 */
export function useDarkMode() {
  const [state, setState] = useUserState()
  const preference = state.preferences.darkMode
  const isDark = preference === 'dark' || (preference !== 'light' && prefersDark())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, darkMode: isDark ? 'light' : 'dark' },
    }))
  }, [isDark, setState])

  return { isDark, toggle }
}
