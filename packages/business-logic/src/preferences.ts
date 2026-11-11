import { DEFAULT_USER_STATE, type UserPreferences } from './types.js'

/**
 * Brings preferences loaded from storage up to date with `DEFAULT_USER_STATE`, since stored
 * state is otherwise used as-is and would lack anything added after it was saved.
 *
 * 1. Keys missing entirely (e.g. `columnSizing` on state saved before it existed) are filled
 *    from the defaults.
 * 2. A column that exists in the default `columnOrder` but not in the stored one is a column
 *    this user has never seen: it's inserted right after its default predecessor (so it lands
 *    where it would for a fresh install, and stays draggable), and if it starts visible by
 *    default it's added to `visibleColumns` once. Because a column is only "new" while it's
 *    absent from the stored `columnOrder`, a user who later hides it isn't overridden again.
 *    Skipped when no `columnOrder` was stored at all — there's nothing to compare against.
 * 3. `prefsVersion` < 1: `types` became a hideable column. It was always visible before, and it is
 *    absent from a stored `visibleColumns`, so it's added once here (then the version is stamped)
 *    or it would silently vanish for existing users.
 */
export function reconcilePreferences(stored: Partial<UserPreferences> | undefined): UserPreferences {
  const defaults = DEFAULT_USER_STATE.preferences
  let merged: UserPreferences = { ...defaults, ...stored }
  if (stored && (stored.prefsVersion ?? 0) < 1) {
    const visible = merged.visibleColumns.includes('types') ? merged.visibleColumns : [...merged.visibleColumns, 'types']
    merged = { ...merged, visibleColumns: visible, prefsVersion: 1 }
  }
  if (!stored?.columnOrder) return merged

  const columnOrder = [...stored.columnOrder]
  const visibleColumns = [...merged.visibleColumns]

  defaults.columnOrder.forEach((id, defaultIndex) => {
    if (columnOrder.includes(id)) return
    const predecessor = defaults.columnOrder[defaultIndex - 1]
    const predecessorIndex = predecessor === undefined ? -1 : columnOrder.indexOf(predecessor)
    columnOrder.splice(predecessorIndex + 1, 0, id)
    if (defaults.visibleColumns.includes(id) && !visibleColumns.includes(id)) visibleColumns.push(id)
  })

  return { ...merged, columnOrder, visibleColumns }
}
