import { DEFAULT_LIST_FILTER, type ListFilter } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

/**
 * Reads/writes the active list's `filter` (per-list, like `ownedIds` — not per-user like
 * `visibleColumns`/`darkMode`, see useColumnVisibility.ts). With no active list it is a no-op: lists
 * are only created by the start wizard (3.19).
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
      setState((prev) => {
        const list = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        if (!list) return prev
        return { ...prev, lists: { ...prev.lists, [list.id]: { ...list, filter: { ...list.filter, [key]: value } } } }
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
