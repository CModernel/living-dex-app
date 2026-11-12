import { DEFAULT_LIST_FILTER, type PokemonList, type TierId } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

export type ListTiers = { tier: TierId; layoutTier?: TierId }

// Every list is created through the start wizard (3.19), which always sets both tiers.
export function createList(name: string, tiers?: ListTiers): PokemonList {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: [],
    ...tiers,
  }
}

export function useLists() {
  const [state, setState] = useUserState()

  const lists = useMemo(
    () => Object.values(state.lists).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.lists],
  )

  const createNewList = useCallback(
    (name: string, tiers?: ListTiers) => {
      // Built outside the updater: a pre-hydration update is replayed, and must produce the same id.
      const list = createList(name, tiers)
      setState((prev) => ({ ...prev, lists: { ...prev.lists, [list.id]: list }, activeListId: list.id }))
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
        // Deleting the active list falls back to another remaining one; only truly empty falls back
        // to null, and Home then shows the "Start" empty state (3.19).
        const remainingIds = Object.keys(rest)
        const activeListId = prev.activeListId !== id ? prev.activeListId : (remainingIds[0] ?? null)
        return { ...prev, lists: rest, activeListId }
      })
    },
    [setState],
  )

  // Edit name, icon and/or tiers. An empty/whitespace name is ignored (keeps the old one); an empty
  // icon clears it. No-ops for an unknown id.
  const updateList = useCallback(
    // `layoutTier: null` clears the box plan (3.19b: back to "undecided").
    (id: string, changes: { name?: string; icon?: string; tier?: TierId; layoutTier?: TierId | null }) => {
      setState((prev) => {
        const list = prev.lists[id]
        if (!list) return prev
        const name = changes.name?.trim() || list.name
        const icon = changes.icon === undefined ? list.icon : changes.icon.trim() || undefined
        const tier = changes.tier ?? list.tier
        const layoutTier = changes.layoutTier === null ? undefined : (changes.layoutTier ?? list.layoutTier)
        const { layoutTier: _old, ...rest } = list
        const next: PokemonList = { ...rest, name, icon, ...(tier ? { tier } : {}), ...(layoutTier ? { layoutTier } : {}) }
        return { ...prev, lists: { ...prev.lists, [id]: next } }
      })
    },
    [setState],
  )

  // Deep copy (filter, owned, per-game tags) with a new id; the clone becomes the active list.
  // `overrides` is the 3.19 "Migrate" path: same collection, new name and tiers.
  const cloneList = useCallback(
    (id: string, overrides?: { name?: string; tier?: TierId; layoutTier?: TierId | null }) => {
      // Identity generated outside the updater so a replayed (pre-hydration) update yields the same copy id.
      const copyId = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      setState((prev) => {
        const src = prev.lists[id]
        if (!src) return prev
        const { layoutTier: srcLayout, ...srcRest } = src
        // `layoutTier: null` → the copy starts with an undecided plan (3.19b).
        const layoutTier = overrides?.layoutTier === null ? undefined : (overrides?.layoutTier ?? srcLayout)
        const copy: PokemonList = {
          ...srcRest,
          id: copyId,
          name: overrides?.name ?? `${src.name} (copy)`,
          createdAt,
          filter: { ...src.filter },
          ownedIds: [...src.ownedIds],
          ownedGames: src.ownedGames
            ? Object.fromEntries(Object.entries(src.ownedGames).map(([k, v]) => [k, [...v]]))
            : undefined,
          ...(overrides?.tier ? { tier: overrides.tier } : {}),
          ...(layoutTier ? { layoutTier } : {}),
        }
        return { ...prev, lists: { ...prev.lists, [copy.id]: copy }, activeListId: copy.id }
      })
    },
    [setState],
  )

  return { lists, activeListId: state.activeListId, createNewList, switchTo, deleteList, updateList, cloneList }
}
