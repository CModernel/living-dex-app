import { toggleOwnedEntry, toggleOwnedGame as toggleGameOnList, type PokemonList } from '@living-dex/business-logic'
import { useCallback, useEffect } from 'react'
import { useIsHydrated, useUserState } from '../state/UserStateContext'
import { createList } from './useLists'

function createDefaultList() {
  return createList('My Living Dex')
}

export function useActiveList() {
  const [state, setState] = useUserState()
  const hydrated = useIsHydrated()

  useEffect(() => {
    // Wait for storage: before that, state is just the defaults and a list created here would be
    // layered over the user's real one.
    if (!hydrated) return
    if (state.activeListId && state.lists[state.activeListId]) return
    const list = createDefaultList()
    setState((prev) => ({
      ...prev,
      lists: { ...prev.lists, [list.id]: list },
      activeListId: list.id,
    }))
  }, [hydrated, state.activeListId, state.lists, setState])

  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined

  // Stable across renders (setState from useState is always stable) — HomePage's memoized
  // TableRow depends on this identity staying put, otherwise every row would be considered
  // "changed" (a new onToggle reference) on every single toggle, defeating that memoization.
  const updateActiveList = useCallback(
    (update: (list: PokemonList) => PokemonList) => {
      let fallback: PokemonList | undefined
      setState((prev) => {
        // Don't rely on the mount effect above having already run — a click can land before
        // that effect commits (e.g. right after the dataset resolves), and a plain "no active
        // list yet, so no-op" here would silently drop it. Create the list inline instead, so
        // this is correct regardless of timing.
        const existing = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        // Created once per call, so a replayed (pre-hydration) update reuses the same list id.
        const list = existing ?? (fallback ??= createDefaultList())
        const next = update(list)
        return { ...prev, lists: { ...prev.lists, [next.id]: next }, activeListId: next.id }
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

  return { activeList, toggleOwned, toggleOwnedGame }
}
