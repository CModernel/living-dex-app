import { DEFAULT_LIST_FILTER, type ListFilter, type PokemonList } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'
import { createList } from './useLists'

/**
 * Reads/writes the active list's `filter` (per-list, like `ownedIds` — not per-user like
 * `visibleColumns`/`darkMode`, see useColumnVisibility.ts). Mirrors useActiveList.ts's
 * toggleOwned: doesn't rely on the mount-time bootstrap having already created a list, so a
 * toggle that lands before that effect commits still applies correctly.
 */
export function useListFilter() {
  const [state, setState] = useUserState()

  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined
  // Merged over the defaults: lists saved before a filter key existed (e.g. 3.8d's
  // `hideInaccessible`) don't have it.
  const storedFilter = activeList?.filter
  const filter = useMemo(() => ({ ...DEFAULT_LIST_FILTER, ...storedFilter }), [storedFilter])

  const setFilterKey = useCallback(
    (key: keyof ListFilter, value: boolean) => {
      let fallback: PokemonList | undefined // one id per call, so a replayed (pre-hydration) update matches
      setState((prev) => {
        const existing = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        const list = existing ?? (fallback ??= createList('My Living Dex'))
        return {
          ...prev,
          lists: { ...prev.lists, [list.id]: { ...list, filter: { ...list.filter, [key]: value } } },
          activeListId: list.id,
        }
      })
    },
    [setState],
  )

  const toggleFinalStageOnly = useCallback(() => setFilterKey('finalStageOnly', !filter.finalStageOnly), [setFilterKey, filter.finalStageOnly])
  const toggleRegionalFormsOnly = useCallback(() => setFilterKey('regionalFormsOnly', !filter.regionalFormsOnly), [setFilterKey, filter.regionalFormsOnly])
  const toggleHideGenderVariants = useCallback(() => setFilterKey('hideGenderVariants', !filter.hideGenderVariants), [setFilterKey, filter.hideGenderVariants])
  const toggleHideInaccessible = useCallback(() => setFilterKey('hideInaccessible', !filter.hideInaccessible), [setFilterKey, filter.hideInaccessible])

  return { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants, toggleHideInaccessible }
}
