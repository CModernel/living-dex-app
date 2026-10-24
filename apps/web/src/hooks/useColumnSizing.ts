import { functionalUpdate, type Updater } from '@tanstack/table-core'
import { useCallback } from 'react'
import { useUserState } from '../state/UserStateContext'

type ColumnSizingState = Record<string, number>

/**
 * Persists HomePage's column widths as `preferences.columnSizing` (3.8f), so a resize
 * survives a reload. Values are relative weights (see `lib/columnWeights.ts`), not pixels.
 * Mirrors `useColumnOrder.ts` — a plain object here instead of a string[].
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
