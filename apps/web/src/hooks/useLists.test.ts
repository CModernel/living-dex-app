import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { useLists } from './useLists'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

test('starts with no lists and no active list', () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })
  expect(result.current.lists).toEqual([])
  expect(result.current.activeListId).toBeNull()
})

test('createNewList adds a list and makes it active', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  // UserStateProvider hydrates from storage asynchronously; mutating before that resolves
  // can get silently clobbered back to defaults once it does (see 3.5's useDarkMode.test.ts
  // for the same guard, and TODO.md for why this is left as-is for now).
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('Shinies'))

  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  expect(result.current.lists[0].name).toBe('Shinies')
  expect(result.current.activeListId).toBe(result.current.lists[0].id)
})

test('switchTo changes the active list only for an existing id', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  // UserStateProvider hydrates from storage asynchronously; a second create/switch before
  // that resolves can get silently clobbered back to defaults once it does (see 3.5's
  // useDarkMode.test.ts for the same guard, and TODO.md for why this is left as-is for now).
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('First'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  act(() => result.current.createNewList('Second'))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))

  const [first, second] = result.current.lists
  expect(result.current.activeListId).toBe(second.id)

  act(() => result.current.switchTo(first.id))
  await waitFor(() => expect(result.current.activeListId).toBe(first.id))

  // Unknown id: no-op, active list stays where it was.
  act(() => result.current.switchTo('does-not-exist'))
  expect(result.current.activeListId).toBe(first.id)
})

test('lists stay in creation order', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('First'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  act(() => result.current.createNewList('Second'))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))
  act(() => result.current.createNewList('Third'))
  await waitFor(() => expect(result.current.lists).toHaveLength(3))

  expect(result.current.lists.map((l) => l.name)).toEqual(['First', 'Second', 'Third'])
})

test('deleteList removes a non-active list without touching the active one', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('First'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  act(() => result.current.createNewList('Second'))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))

  const [first, second] = result.current.lists
  expect(result.current.activeListId).toBe(second.id)

  act(() => result.current.deleteList(first.id))

  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  expect(result.current.lists[0].id).toBe(second.id)
  expect(result.current.activeListId).toBe(second.id)
})

test('deleting the active list falls back to another remaining one', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('First'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  act(() => result.current.createNewList('Second'))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))

  const [first, second] = result.current.lists
  expect(result.current.activeListId).toBe(second.id)

  // Second is active; deleting it must not leave activeListId dangling when First is
  // still right there — no reason to force useActiveList's bootstrap to spin up a new one.
  act(() => result.current.deleteList(second.id))

  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  expect(result.current.activeListId).toBe(first.id)
})

test('deleting the last remaining list nulls activeListId', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('Only'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  const only = result.current.lists[0]

  act(() => result.current.deleteList(only.id))

  await waitFor(() => expect(result.current.lists).toHaveLength(0))
  expect(result.current.activeListId).toBeNull()
})

test('deleteList no-ops for an unknown id', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  act(() => result.current.createNewList('Only'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))

  act(() => result.current.deleteList('does-not-exist'))
  expect(result.current.lists).toHaveLength(1)
})
