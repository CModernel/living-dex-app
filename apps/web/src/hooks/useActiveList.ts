import { toggleOwnedEntry, toggleOwnedGame as toggleGameOnList, type PokemonList } from '@living-dex/business-logic'
import { useCallback } from 'react'
import { useUserState } from '../state/UserStateContext'

// No list is created implicitly any more (3.19): a new user goes through the start wizard, which picks
// the tiers. With no active list, every update here is a no-op and Home shows the "Start" empty state.
export function useActiveList() {
  const [state, setState] = useUserState()
  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined

  // Stable across renders (setState from useState is always stable) — HomePage's memoized
  // TableRow depends on this identity staying put, otherwise every row would be considered
  // "changed" (a new onToggle reference) on every single toggle, defeating that memoization.
  const updateActiveList = useCallback(
    (update: (list: PokemonList) => PokemonList) => {
      setState((prev) => {
        const list = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        if (!list) return prev
        const next = update(list)
        return { ...prev, lists: { ...prev.lists, [next.id]: next } }
      })
    },
    [setState],
  )

  // Owned/game-tag rules live in business-logic's owned.ts (3.7b): un-owning also clears tags,
  // tagging a game also owns.
  const toggleOwned = useCallback((slug: string) => updateActiveList((list) => toggleOwnedEntry(list, slug)), [updateActiveList])
  const toggleOwnedGame = useCallback(
    (slug: string, gameId: string) => updateActiveList((list) => toggleGameOnList(list, slug, gameId)),
    [updateActiveList],
  )

  return { activeList, updateActiveList, toggleOwned, toggleOwnedGame }
}
