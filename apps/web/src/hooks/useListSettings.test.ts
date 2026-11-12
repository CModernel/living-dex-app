import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { seedState, testList, STORAGE_KEY } from '../test/seed'
import { useListSettings } from './useListSettings'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

const storedLists = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).lists

test('defaults apply and an update only changes the active list (3.36)', async () => {
  seedState([testList('1', 'One', { ownedIds: ['a'] }), testList('2', 'Two')])
  const { result } = renderHook(() => useListSettings(), { wrapper: UserStateProvider })
  await waitFor(() => expect(result.current.settings.viewMode).toBe('table'))

  act(() => result.current.updateSettings({ viewMode: 'grid' }))
  await waitFor(() => expect(result.current.settings.viewMode).toBe('grid'))
  act(() => result.current.updateSettings((c) => ({ showFutureSlots: !c.showFutureSlots })))
  await waitFor(() => expect(result.current.settings.showFutureSlots).toBe(true))
  await waitFor(() => expect(storedLists()['1'].settings).toEqual({ viewMode: 'grid', showFutureSlots: true }))
  expect(storedLists()['2'].settings).toBeUndefined()
  expect(storedLists()['1'].ownedIds).toEqual(['a'])
})

test('without a list it is a no-op', async () => {
  const { result } = renderHook(() => useListSettings(), { wrapper: UserStateProvider })
  act(() => result.current.updateSettings({ viewMode: 'grid' }))
  expect(result.current.settings.viewMode).toBe('table')
})
