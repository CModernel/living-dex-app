import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
 import { DEFAULT_LIST_FILTER } from '@living-dex/business-logic'
import { useListFilter } from './useListFilter'
import { seedDefaultList } from '../test/seed'

const KEY = 'living-dex:user-state'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

test('starts with the default filter', () => {
  const { result } = renderHook(() => useListFilter(), { wrapper: UserStateProvider })
  expect(result.current.filter).toEqual(DEFAULT_LIST_FILTER)
})

test('each toggle flips only its own key on the active list', async () => {
  seedDefaultList()
  const { result } = renderHook(() => useListFilter(), { wrapper: UserStateProvider })

  act(() => result.current.toggleFinalStageOnly())
  await waitFor(() => expect(result.current.filter.finalStageOnly).toBe(true))
  expect(result.current.filter).toEqual({ ...DEFAULT_LIST_FILTER, finalStageOnly: true })

  act(() => result.current.toggleHideInaccessible())
  await waitFor(() => expect(result.current.filter.hideInaccessible).toBe(true))
  expect(result.current.filter.finalStageOnly).toBe(true)

  act(() => result.current.toggleFinalStageOnly())
  await waitFor(() => expect(result.current.filter.finalStageOnly).toBe(false))
})

test('a list saved before a filter key existed gets the default for that key', async () => {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({
      lists: {
        a: { id: 'a', name: 'Old', createdAt: '2026-01-01T00:00:00.000Z', dataVersion: 'v1', variant: 'normal', filter: { finalStageOnly: true }, ownedIds: [] },
      },
      activeListId: 'a',
      preferences: { visibleColumns: [], compactMode: false },
    }),
  )
  const { result } = renderHook(() => useListFilter(), { wrapper: UserStateProvider })
  await waitFor(() => expect(result.current.filter.finalStageOnly).toBe(true))
  expect(result.current.filter.hideInaccessible).toBe(false)
})
