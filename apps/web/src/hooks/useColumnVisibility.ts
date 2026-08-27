import { functionalUpdate, type Updater } from '@tanstack/table-core'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

// The columns HomePage's column-visibility menu (3.4) can hide. Kept here rather than
// derived from HomePage's own column defs — there's no way to know which ids are
// hideable without the table already existing, and this hook feeds the table's
// visibility *input*. Must stay in sync with HomePage.tsx's `columnHelper.accessor`
// calls that don't set `enableHiding: false`.
export const HIDEABLE_COLUMN_IDS = ['dex', 'generation', 'region', 'evolutionStage'] as const

type ColumnVisibilityState = Record<string, boolean>

function toTableState(visibleColumns: string[]): ColumnVisibilityState {
  const visible = new Set(visibleColumns)
  return Object.fromEntries(HIDEABLE_COLUMN_IDS.map((id) => [id, visible.has(id)]))
}

/**
 * Persists HomePage's column visibility as `preferences.visibleColumns` (3.5), so it
 * survives a reload. Stores the array shape `UserPreferences` already declares — not
 * TanStack's own `Record<string, boolean>` — so the persisted format doesn't depend on
 * which table library ends up rendering it.
 *
 * `setColumnVisibility` is TanStack's controlled-state shape directly
 * (`OnChangeFn<ColumnVisibilityState>`, i.e. a value or an updater function) so it can be
 * passed straight to `useTable`'s `onColumnVisibilityChange` — `column.toggleVisibility()`
 * calls it with an updater, not a plain value (confirmed against the installed package's
 * own `table-state` skill doc), so this has to resolve both via `functionalUpdate`.
 */
export function useColumnVisibility() {
  const [state, setState] = useUserState()

  const columnVisibility = useMemo(
    () => toTableState(state.preferences.visibleColumns),
    [state.preferences.visibleColumns],
  )

  const setColumnVisibility = useCallback(
    (updater: Updater<ColumnVisibilityState>) => {
      setState((prev) => {
        const next = functionalUpdate(updater, toTableState(prev.preferences.visibleColumns))
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            visibleColumns: HIDEABLE_COLUMN_IDS.filter((id) => next[id]),
          },
        }
      })
    },
    [setState],
  )

  return { columnVisibility, setColumnVisibility }
}
