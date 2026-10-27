import { GAMES, selectedGameIds as toSelectedGameIds } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

const NO_EXCLUDED_GAMES: string[] = []

/**
 * The games that count for availability (3.8d), persisted per user as
 * `preferences.excludedGameIds` — like `visibleColumns`, it's about the user, not a list.
 */
export function useGameSelection() {
  const [state, setState] = useUserState()

  const excludedGameIds = state.preferences.excludedGameIds ?? NO_EXCLUDED_GAMES
  const selectedGameIds = useMemo(() => toSelectedGameIds(excludedGameIds), [excludedGameIds])

  const setExcluded = useCallback(
    (update: (prev: string[]) => string[]) => {
      setState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, excludedGameIds: update(prev.preferences.excludedGameIds ?? []) },
      }))
    },
    [setState],
  )

  const toggleGame = useCallback(
    (gameId: string) =>
      setExcluded((prev) => (prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId])),
    [setExcluded],
  )
  const selectAllGames = useCallback(() => setExcluded(() => []), [setExcluded])
  const selectNoGames = useCallback(() => setExcluded(() => GAMES.map((g) => g.id)), [setExcluded])

  return { selectedGameIds, toggleGame, selectAllGames, selectNoGames }
}
