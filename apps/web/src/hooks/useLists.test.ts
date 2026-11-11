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

  act(() => result.current.createNewList('Shinies'))

  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  expect(result.current.lists[0].name).toBe('Shinies')
  expect(result.current.activeListId).toBe(result.current.lists[0].id)
})

test('switchTo changes the active list only for an existing id', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

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

  act(() => result.current.createNewList('Only'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  const only = result.current.lists[0]

  act(() => result.current.deleteList(only.id))

  await waitFor(() => expect(result.current.lists).toHaveLength(0))
  expect(result.current.activeListId).toBeNull()
})

test('deleteList no-ops for an unknown id', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })

  act(() => result.current.createNewList('Only'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))

  act(() => result.current.deleteList('does-not-exist'))
  expect(result.current.lists).toHaveLength(1)
})

test('updateList renames and sets/clears the icon; ignores blank names and unknown ids', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })
  act(() => result.current.createNewList('Dex'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  const id = result.current.lists[0].id

  act(() => result.current.updateList(id, { name: '  Base  ', icon: '⭐' }))
  await waitFor(() => expect(result.current.lists[0].name).toBe('Base'))
  expect(result.current.lists[0].icon).toBe('⭐')

  act(() => result.current.updateList(id, { name: '   ' }))
  expect(result.current.lists[0].name).toBe('Base')

  act(() => result.current.updateList(id, { icon: '' }))
  await waitFor(() => expect(result.current.lists[0].icon).toBeUndefined())

  act(() => result.current.updateList('nope', { name: 'X' }))
  expect(result.current.lists).toHaveLength(1)
})

test('cloneList deep-copies owned data, gets a new id and becomes active', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })
  act(() => result.current.createNewList('Dex'))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  const src = result.current.lists[0]

  act(() => result.current.cloneList(src.id))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))
  const copy = result.current.lists[1]
  expect(copy.id).not.toBe(src.id)
  expect(copy.name).toBe('Dex (copy)')
  expect(copy.filter).toEqual(src.filter)
  expect(copy.filter).not.toBe(src.filter)
  expect(copy.ownedIds).not.toBe(src.ownedIds)
  expect(result.current.activeListId).toBe(copy.id)

  act(() => result.current.cloneList('nope'))
  expect(result.current.lists).toHaveLength(2)
})

test('tiers: createNewList stores them, updateList changes them, cloneList overrides them (3.19)', async () => {
  const { result } = renderHook(() => useLists(), { wrapper: UserStateProvider })
  act(() => result.current.createNewList('Dex', { tier: 'final-form', layoutTier: 'living-form-full' }))
  await waitFor(() => expect(result.current.lists).toHaveLength(1))
  const id = result.current.lists[0].id
  expect(result.current.lists[0]).toMatchObject({ tier: 'final-form', layoutTier: 'living-form-full' })

  act(() => result.current.updateList(id, { tier: 'living-form' }))
  await waitFor(() => expect(result.current.lists[0].tier).toBe('living-form'))
  expect(result.current.lists[0].layoutTier).toBe('living-form-full')

  act(() => result.current.cloneList(id, { name: 'Dex (Full)', tier: 'living-form-full', layoutTier: 'living-form-full' }))
  await waitFor(() => expect(result.current.lists).toHaveLength(2))
  expect(result.current.lists[1]).toMatchObject({ name: 'Dex (Full)', tier: 'living-form-full', layoutTier: 'living-form-full' })
  expect(result.current.activeListId).toBe(result.current.lists[1].id)
  expect(result.current.lists[0]).toMatchObject({ name: 'Dex', tier: 'living-form' })
})
