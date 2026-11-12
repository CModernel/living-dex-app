import { GAMES, selectedGameIds as toSelectedGameIds } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useListSettings } from './useListSettings'

/**
 * The games that count for availability (3.8d), persisted per list (3.36) as `settings.excludedGameIds`:
 * every list keeps its own game selection.
 */
export function useGameSelection() {
  const { settings, updateSettings } = useListSettings()

  const excludedGameIds = settings.excludedGameIds
  const selectedGameIds = useMemo(() => toSelectedGameIds(excludedGameIds), [excludedGameIds])

  const setExcluded = useCallback(
    (update: (prev: string[]) => string[]) => updateSettings((current) => ({ excludedGameIds: update(current.excludedGameIds) })),
    [updateSettings],
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
