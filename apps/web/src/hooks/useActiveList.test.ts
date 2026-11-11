import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
 import { useActiveList } from './useActiveList'
import { seedDefaultList } from '../test/seed'

const KEY = 'living-dex:user-state'

beforeEach(() => {
  window.localStorage.clear()
  seedDefaultList()
})
afterEach(() => window.localStorage.clear())

function stored() {
  return JSON.parse(window.localStorage.getItem(KEY) ?? '{"lists":{}}')
}

test('never creates a list on its own: with nothing stored there is no active list and toggles are no-ops', async () => {
  window.localStorage.clear()
  const { result } = renderHook(() => useActiveList(), { wrapper: UserStateProvider })
  act(() => result.current.toggleOwned('bulbasaur'))
  await waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull())
  expect(result.current.activeList).toBeUndefined()
  expect(Object.keys(stored().lists)).toHaveLength(0)
})

test('toggleOwned owns then un-owns an entry', async () => {
  const { result } = renderHook(() => useActiveList(), { wrapper: UserStateProvider })
  await waitFor(() => expect(result.current.activeList).toBeDefined())

  act(() => result.current.toggleOwned('bulbasaur'))
  await waitFor(() => expect(result.current.activeList?.ownedIds).toEqual(['bulbasaur']))

  act(() => result.current.toggleOwned('bulbasaur'))
  await waitFor(() => expect(result.current.activeList?.ownedIds).toEqual([]))
})

test('toggleOwnedGame tags a game (which also owns) and untagging keeps it owned', async () => {
  const { result } = renderHook(() => useActiveList(), { wrapper: UserStateProvider })
  await waitFor(() => expect(result.current.activeList).toBeDefined())

  act(() => result.current.toggleOwnedGame('bulbasaur', 'red'))
  await waitFor(() => expect(result.current.activeList?.ownedGames).toEqual({ bulbasaur: ['red'] }))
  expect(result.current.activeList?.ownedIds).toContain('bulbasaur')

  act(() => result.current.toggleOwnedGame('bulbasaur', 'red'))
  await waitFor(() => expect(result.current.activeList?.ownedGames).toEqual({}))
  expect(result.current.activeList?.ownedIds).toContain('bulbasaur')
})

test('a toggle made before hydration is replayed onto the stored list', async () => {
  const { result } = renderHook(() => useActiveList(), { wrapper: UserStateProvider })
  act(() => result.current.toggleOwned('pikachu')) // storage has not loaded yet
  await waitFor(() => expect(result.current.activeList?.ownedIds).toEqual(['pikachu']))
  await waitFor(() => expect(Object.keys(stored().lists)).toHaveLength(1))
  expect(Object.values(stored().lists as Record<string, { ownedIds: string[] }>)[0].ownedIds).toEqual(['pikachu'])
})
