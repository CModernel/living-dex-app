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
  // deleted in another tab, once deletion exists).
  const switchTo = useCallback(
    (id: string) => {
      setState((prev) => (prev.lists[id] ? { ...prev, activeListId: id } : prev))
    },
    [setState],
  )

  return { lists, activeListId: state.activeListId, createNewList, switchTo }
}
