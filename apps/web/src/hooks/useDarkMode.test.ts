import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { useDarkMode } from './useDarkMode'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  window.localStorage.clear()
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  window.localStorage.clear()
})

test('toggle flips isDark and the document.documentElement "dark" class', async () => {
  const { result } = renderHook(() => useDarkMode(), { wrapper: UserStateProvider })
  const initial = result.current.isDark

  // UserStateProvider hydrates from storage asynchronously (StorageAdapter is Promise-based
  // for future AsyncStorage-on-mobile compatibility); toggling before that resolves would
  // get clobbered back to defaults once it does. Its write-back effect only fires after
  // hydration completes, so a first localStorage write is a reliable "hydrated" signal.
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.toggle())

  await waitFor(() => expect(result.current.isDark).toBe(!initial))
  expect(document.documentElement.classList.contains('dark')).toBe(!initial)
})

test('the toggled preference persists to localStorage', async () => {
  const { result } = renderHook(() => useDarkMode(), { wrapper: UserStateProvider })
  const initial = result.current.isDark

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.toggle())
  await waitFor(() => expect(result.current.isDark).toBe(!initial))

  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    expect(stored.preferences.darkMode).toBe(initial ? 'light' : 'dark')
  })
})
