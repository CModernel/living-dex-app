import { resolveListSettings, type ListSettings } from '@living-dex/business-logic'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

type SettingsUpdate = Partial<ListSettings> | ((current: Required<ListSettings>) => Partial<ListSettings>)

/**
 * Reads/writes the active list's `settings` (3.36: view mode, future slots, games — each list keeps its own, like
 * `filter` and `ownedIds`; columns/density/theme stay per user, see useColumnVisibility.ts). Merged over the
 * defaults. With no active list it is a no-op.
 */
export function useListSettings() {
  const [state, setState] = useUserState()

  const activeList = state.activeListId ? state.lists[state.activeListId] : undefined
  const stored = activeList?.settings
  const settings = useMemo(() => resolveListSettings(stored), [stored])

  const updateSettings = useCallback(
    (update: SettingsUpdate) => {
      setState((prev) => {
        const list = prev.activeListId ? prev.lists[prev.activeListId] : undefined
        if (!list) return prev
        const changes = typeof update === 'function' ? update(resolveListSettings(list.settings)) : update
        return { ...prev, lists: { ...prev.lists, [list.id]: { ...list, settings: { ...list.settings, ...changes } } } }
      })
    },
    [setState],
  )

  return { settings, updateSettings }
}
