import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider, useUserState } from '../state/UserStateContext'
import { DEFAULT_USER_STATE } from '@living-dex/business-logic'
import { useColumnVisibility } from './useColumnVisibility'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

test('only dex starts visible by default; every other hideable column (types, box, slot...) starts hidden', () => {
  const { result } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })
  expect(result.current.columnVisibility).toEqual({
    species: false,
    types: false,
    dex: true,
    box: false,
    slot: false,
    position: false,
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
    // dex is already true by default, so it's included alongside the newly-toggled column.
    expect(stored.preferences.visibleColumns).toEqual(['dex', 'generation'])
  })
  unmount()

  const { result: reloaded } = renderHook(() => useColumnVisibility(), { wrapper: UserStateProvider })
  await waitFor(() => expect(reloaded.current.columnVisibility.generation).toBe(true))
})

test('resetColumns restores default visibility, order and widths', async () => {
  const { result } = renderHook(
    () => ({ visibility: useColumnVisibility(), state: useUserState() }),
    { wrapper: UserStateProvider },
  )
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => {
    result.current.visibility.setColumnVisibility((prev) => ({ ...prev, types: true, box: true }))
    result.current.state[1]((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, columnOrder: ['owned', 'sprite'], columnSizing: { name: 500 } },
    }))
  })
  await waitFor(() => expect(result.current.visibility.columnVisibility.types).toBe(true))

  act(() => result.current.visibility.resetColumns())
  await waitFor(() => expect(result.current.visibility.columnVisibility.types).toBe(false))
  const prefs = result.current.state[0].preferences
  expect(prefs.visibleColumns).toEqual(DEFAULT_USER_STATE.preferences.visibleColumns)
  expect(prefs.columnOrder).toEqual(DEFAULT_USER_STATE.preferences.columnOrder)
  expect(prefs.columnSizing).toEqual({})
})
