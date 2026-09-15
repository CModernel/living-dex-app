import { DEFAULT_LIST_FILTER, type ListFilter } from '@living-dex/business-logic'
import { useCallback } from 'react'
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
  const filter = activeList?.filter ?? DEFAULT_LIST_FILTER

  const setFilterKey = useCallback(
    (key: keyof ListFilter, value: boolean) => {
      setState((prev) => {
        const list = (prev.activeListId ? prev.lists[prev.activeListId] : undefined) ?? createList('My Living Dex')
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

  return { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants }
}
