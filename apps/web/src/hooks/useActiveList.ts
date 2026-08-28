import { useCallback, useEffect } from 'react'
import { useUserState } from '../state/UserStateContext'
import { createList } from './useLists'

function createDefaultList() {
  return createList('My Living Dex')
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

  // Stable across renders (setState from useState is always stable) — HomePage's memoized
  // TableRow depends on this identity staying put, otherwise every row would be considered
  // "changed" (a new onToggle reference) on every single toggle, defeating that memoization.
  const toggleOwned = useCallback(
    (slug: string) => {
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
    },
    [setState],
  )

  return { activeList, toggleOwned }
}
