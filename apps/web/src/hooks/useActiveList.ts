import { DEFAULT_LIST_FILTER, type PokemonList } from '@living-dex/business-logic'
import { useEffect } from 'react'
import { useUserState } from '../state/UserStateContext'

function createDefaultList(): PokemonList {
  return {
    id: crypto.randomUUID(),
    name: 'My Living Dex',
    createdAt: new Date().toISOString(),
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: [],
  }
}

export function useActiveList() {
  const [state, setState] = useUserState()

  useEffect(() => {
    if (state.activeListId && state.lists[state.activeListId]) return
    const list = createDefaultList()
    setState((prev) => ({
      ...prev,
      lists: { ...prev.lists, [list.id]: list },
      activeListId: list.id,
    }))
  }, [state.activeListId, state.lists, setState])

  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined

  function toggleOwned(slug: string) {
    setState((prev) => {
      // Don't rely on the mount effect above having already run — a click can land before
      // that effect commits (e.g. right after the dataset resolves), and a plain "no active
      // list yet, so no-op" here would silently drop it. Create the list inline instead, so
      // this is correct regardless of timing.
      const list = (prev.activeListId ? prev.lists[prev.activeListId] : undefined) ?? createDefaultList()

      const owned = new Set(list.ownedIds)
      if (owned.has(slug)) owned.delete(slug)
      else owned.add(slug)

      return {
        ...prev,
        lists: { ...prev.lists, [list.id]: { ...list, ownedIds: Array.from(owned) } },
        activeListId: list.id,
      }
    })
  }

  return { activeList, toggleOwned }
}
