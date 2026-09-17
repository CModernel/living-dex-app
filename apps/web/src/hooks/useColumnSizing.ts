import { functionalUpdate, type Updater } from '@tanstack/table-core'
import { useCallback } from 'react'
import { useUserState } from '../state/UserStateContext'

type ColumnSizingState = Record<string, number>

/**
 * Persists HomePage's column widths as `preferences.columnSizing` (3.8f), so a resize
 * survives a reload. Mirrors `useColumnOrder.ts` — a plain object here instead of a
 * string[], no shape conversion needed either way.
 *
 * `setColumnSizing` is TanStack's controlled-state shape directly
 * (`OnChangeFn<ColumnSizingState>`) so it can be passed straight to `useTable`'s
 * `onColumnSizingChange`.
 */
export function useColumnSizing() {
  const [state, setState] = useUserState()

  const columnSizing = state.preferences.columnSizing

  const setColumnSizing = useCallback(
    (updater: Updater<ColumnSizingState>) => {
      setState((prev) => {
        const next = functionalUpdate(updater, prev.preferences.columnSizing)
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            columnSizing: next,
          },
        }
      })
    },
    [setState],
  )

  return { columnSizing, setColumnSizing }
}
