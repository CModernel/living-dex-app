import { DEFAULT_LIST_FILTER, type ListFilter } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

export type FilterView = 'table' | 'grid'

/**
 * Reads/writes the active list's filter for one view (per-list, like `ownedIds` — not per-user like
 * `visibleColumns`/`darkMode`, see useColumnVisibility.ts). The table's is `list.filter`; the grid's (3.35) is
 * `list.settings.grid.filter`, so the two never affect each other. With no active list it is a no-op: lists are only
 * created by the tier picker (3.19b).
 */
export function useListFilter(view: FilterView = 'table') {
  const [state, setState] = useUserState()

  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined
  // Merged over the defaults: lists saved before a filter key existed (e.g. 3.8d's
  // `hideInaccessible`) don't have it.
  const storedFilter = view === 'grid' ? activeList?.settings?.grid?.filter : activeList?.filter
  const filter = useMemo(() => ({ ...DEFAULT_LIST_FILTER, ...storedFilter }), [storedFilter])

  const setFilterKey = useCallback(
    (key: keyof ListFilter, value: boolean) => {
      setState((prev) => {
        const list = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        if (!list) return prev
        if (view === 'table') return { ...prev, lists: { ...prev.lists, [list.id]: { ...list, filter: { ...list.filter, [key]: value } } } }
        const grid = { ...list.settings?.grid, filter: { ...list.settings?.grid?.filter, [key]: value } }
        return { ...prev, lists: { ...prev.lists, [list.id]: { ...list, settings: { ...list.settings, grid } } } }
      })
    },
    [setState, view],
  )

  const toggleFinalStageOnly = useCallback(() => setFilterKey('finalStageOnly', !filter.finalStageOnly), [setFilterKey, filter.finalStageOnly])
  const toggleRegionalFormsOnly = useCallback(() => setFilterKey('regionalFormsOnly', !filter.regionalFormsOnly), [setFilterKey, filter.regionalFormsOnly])
  const toggleHideGenderVariants = useCallback(() => setFilterKey('hideGenderVariants', !filter.hideGenderVariants), [setFilterKey, filter.hideGenderVariants])
  const toggleHideInaccessible = useCallback(() => setFilterKey('hideInaccessible', !filter.hideInaccessible), [setFilterKey, filter.hideInaccessible])

  return { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants, toggleHideInaccessible }
}
