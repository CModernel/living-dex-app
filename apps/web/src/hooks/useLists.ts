import { DEFAULT_LIST_FILTER, type PokemonList } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

// Shared with useActiveList.ts's bootstrap-on-first-visit list, so both paths that can create a
// list use the exact same defaults.
export function createList(name: string): PokemonList {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: [],
  }
}

export function useLists() {
  const [state, setState] = useUserState()

  const lists = useMemo(
    () => Object.values(state.lists).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.lists],
  )

  const createNewList = useCallback(
    (name: string) => {
      setState((prev) => {
        const list = createList(name)
        return { ...prev, lists: { ...prev.lists, [list.id]: list }, activeListId: list.id }
      })
    },
    [setState],
  )

  // No-ops for an unknown id rather than throwing — defensive against a stale id (e.g. a list
  // deleted in another tab).
  const switchTo = useCallback(
    (id: string) => {
      setState((prev) => (prev.lists[id] ? { ...prev, activeListId: id } : prev))
    },
    [setState],
  )

  const deleteList = useCallback(
    (id: string) => {
      setState((prev) => {
        if (!prev.lists[id]) return prev
        const { [id]: _removed, ...rest } = prev.lists
        // Deleting the active list falls back to another remaining one (whichever was
        // created first) rather than nulling activeListId outright — no reason to force
        // useActiveList's bootstrap to spin up a brand new default list when a perfectly
        // good one is already sitting right there. Only truly empty falls back to null,
        // which useActiveList's own bootstrap effect handles the next time Home renders.
        const remainingIds = Object.keys(rest)
        const activeListId = prev.activeListId !== id ? prev.activeListId : (remainingIds[0] ?? null)
        return { ...prev, lists: rest, activeListId }
      })
    },
    [setState],
  )

  return { lists, activeListId: state.activeListId, createNewList, switchTo, deleteList }
}
