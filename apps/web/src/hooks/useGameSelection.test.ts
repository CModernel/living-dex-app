import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
 import { GAMES } from '@living-dex/business-logic'
import { useGameSelection } from './useGameSelection'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

test('every game is selected by default', () => {
  const { result } = renderHook(() => useGameSelection(), { wrapper: UserStateProvider })
  expect(result.current.selectedGameIds).toEqual(GAMES.map((g) => g.id))
})

test('toggleGame deselects and reselects one game', async () => {
  const { result } = renderHook(() => useGameSelection(), { wrapper: UserStateProvider })
  const id = GAMES[0].id

  act(() => result.current.toggleGame(id))
  await waitFor(() => expect(result.current.selectedGameIds).not.toContain(id))
  expect(result.current.selectedGameIds).toHaveLength(GAMES.length - 1)

  act(() => result.current.toggleGame(id))
  await waitFor(() => expect(result.current.selectedGameIds).toContain(id))
})

test('selectNoGames then selectAllGames', async () => {
  const { result } = renderHook(() => useGameSelection(), { wrapper: UserStateProvider })

  act(() => result.current.selectNoGames())
  await waitFor(() => expect(result.current.selectedGameIds).toEqual([]))

  act(() => result.current.selectAllGames())
  await waitFor(() => expect(result.current.selectedGameIds).toHaveLength(GAMES.length))
})
