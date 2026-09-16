import { functionalUpdate, type Updater } from '@tanstack/table-core'
import { useCallback, useMemo } from 'react'
import { useUserState } from '../state/UserStateContext'

type ColumnOrderState = string[]

/**
 * Persists HomePage's column order as `preferences.columnOrder` (3.8c), so it
 * survives a reload. Unlike `useColumnVisibility`, which converts between persisted
 * array and TanStack's Record<string, boolean> shape, column order is already
 * string[] end to end — no conversion needed.
 *
 * `setColumnOrder` is TanStack's controlled-state shape directly
 * (`OnChangeFn<ColumnOrderState>`, i.e. a value or an updater function) so it can be
 * passed straight to `useTable`'s `onColumnOrderChange`.
 */
export function useColumnOrder() {
  const [state, setState] = useUserState()

  const columnOrder = useMemo(
    () => state.preferences.columnOrder,
    [state.preferences.columnOrder],
  )

  const setColumnOrder = useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setState((prev) => {
        const next = functionalUpdate(updater, prev.preferences.columnOrder)
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            columnOrder: next,
          },
        }
      })
    },
    [setState],
  )

  return { columnOrder, setColumnOrder }
}
