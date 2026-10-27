import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { useColumnVisibility } from './useColumnVisibility'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

test('dex, box and slot start visible by default; every other hideable column starts hidden', () => {
  const { result } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })
  expect(result.current.columnVisibility).toEqual({
    dex: true,
    box: true,
    slot: true,
    generation: false,
    region: false,
    availability: false,
    evolutionStage: false,
  })
})

test('setColumnVisibility accepts a plain value, matching one column', async () => {
  const { result } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })

  act(() => {
    result.current.setColumnVisibility({ dex: true, generation: false, region: false, evolutionStage: false })
  })

  await waitFor(() => expect(result.current.columnVisibility.dex).toBe(true))
  expect(result.current.columnVisibility.generation).toBe(false)
})

test('setColumnVisibility accepts an updater function, as TanStack\'s column.toggleVisibility() calls it', async () => {
  const { result } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })

  act(() => {
    result.current.setColumnVisibility((prev) => ({ ...prev, region: true }))
  })

  await waitFor(() => expect(result.current.columnVisibility.region).toBe(true))
  // Untouched columns keep their previous (hidden) state.
  expect(result.current.columnVisibility.generation).toBe(false)
})

test('visibility persists to localStorage and survives a fresh hook instance', async () => {
  const { result, unmount } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })

  // UserStateProvider hydrates from storage asynchronously; changing state before that
  // resolves would get clobbered back to defaults once it does. Its write-back effect only
  // fires after hydration completes, so a first localStorage write is a reliable signal.
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.setColumnVisibility((prev) => ({ ...prev, generation: true })))
  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    // dex/box/slot are already true by default, so they're included alongside the newly-toggled column.
    expect(stored.preferences.visibleColumns).toEqual(['dex', 'box', 'slot', 'generation'])
  })
  unmount()

  const { result: reloaded } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })
  await waitFor(() => expect(reloaded.current.columnVisibility.generation).toBe(true))
})
