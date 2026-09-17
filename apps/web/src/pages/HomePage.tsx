import {
  applyListFilter,
  getPokeJungleSpriteUrl,
  getSpriteUrl,
  type PokemonEntry,
  type PokemonDataset,
} from '@living-dex/business-logic'
import { TIERS, type TierId } from '@cmodernel/living-dex-tiers'
import { flexRender, useTable } from '@tanstack/react-table'
import {
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  tableFeatures,
  type ColumnDef,
  type Row,
} from '@tanstack/table-core'
import { memo, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu'
import FilterMenu from '../components/FilterMenu'
import ListSwitcher from '../components/ListSwitcher'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
import { useColumnOrder } from '../hooks/useColumnOrder'
import { useColumnSizing } from '../hooks/useColumnSizing'
import { useColumnVisibility } from '../hooks/useColumnVisibility'
import { useDataset } from '../hooks/useDataset'
import { useListFilter } from '../hooks/useListFilter'

const TIER_LABELS: Record<TierId, string> = {
  'living-form-full': 'Living Form Full',
  'living-form': 'Living Form',
  'living-lite': 'Living Lite',
  'final-form-full': 'Final Form Full',
  'final-form': 'Final Form',
}

// Module-level: no runtime data dependency, must stay stable across renders.
const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
})
const columnHelper = createColumnHelper<typeof features, PokemonEntry>()

// The hover tooltip keeps this same zoom ratio relative to the base size — bump SPRITE_SIZE
// alone to resize both consistently.
const SPRITE_SIZE = 56
const SPRITE_HOVER_ZOOM = 2

// Per-column cell styling that a plain accessor column can't express on its own (text
// alignment, and capitalizing Region/Stage's raw lowercase slugs — display-only, the
// underlying data stays untouched). Centralized here so both the header `<th>` and body
// `<td>` pull from the same source and can't drift apart.
const COLUMN_CELL_CLASS: Record<string, string> = {
  dex: 'text-left',
  generation: 'text-center',
  region: 'capitalize',
  evolutionStage: 'capitalize',
}

// Prefers PokeJungle (the sprites Austin John's own sheet uses) and falls back to
// PokeAPI. The fallback isn't just belt-and-braces: PokeJungle has no shiny art for the
// per-combination Alcremie/Minior forms, and a dataset published before `pokejungleId`
// existed returns null here — both cases land on PokeAPI without any special handling.
function Sprite({ dataset, entry }: { dataset: PokemonDataset; entry: PokemonEntry }) {
  const pokeApiUrl = getSpriteUrl(dataset, entry)
  const pokeJungleUrl = getPokeJungleSpriteUrl(dataset, entry)
  // Records WHICH url failed rather than a bare "it failed" flag: switching tiers
  // re-renders rows in place, so one Sprite instance can end up showing a different
  // entry, and a boolean would strand that new entry on the fallback.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  // The tooltip renders through a portal (below) rather than as an absolutely-positioned
  // sibling, because the table's rounded-corner wrapper clips overflow — a plain
  // group-hover sibling gets cut off at the table's own top/bottom edge instead of
  // floating above the row it belongs to. Storing the anchor rect (read once, on hover
  // start) rather than recomputing on every render avoids layout thrashing.
  const imgRef = useRef<HTMLImageElement>(null)
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)

  const usePokeJungle = pokeJungleUrl !== null && failedUrl !== pokeJungleUrl
  const spriteUrl = (usePokeJungle ? pokeJungleUrl : pokeApiUrl) ?? undefined
  // Re-setting the same value is a no-op in React, so a fallback that also 404s just
  // stops here instead of looping.
  const handleError = usePokeJungle ? () => setFailedUrl(pokeJungleUrl) : undefined
  const hoverSize = SPRITE_SIZE * SPRITE_HOVER_ZOOM

  return (
    <div className="inline-block">
      <img
        ref={imgRef}
        src={spriteUrl}
        alt=""
        loading="lazy"
        onError={handleError}
        onMouseEnter={() => setHoverRect(imgRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setHoverRect(null)}
        style={{ width: SPRITE_SIZE, height: SPRITE_SIZE, maxWidth: 'none' }}
      />
      {hoverRect &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 rounded border border-border bg-background p-2 shadow-lg"
            style={{
              left: hoverRect.left + hoverRect.width / 2,
              top: hoverRect.top + hoverRect.height / 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img
              src={spriteUrl}
              alt=""
              onError={handleError}
              style={{ width: hoverSize, height: hoverSize, maxWidth: 'none' }}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}

// Reorders `order` so `draggedId` sits immediately next to `targetId`, on the side matching the
// original drag direction — inserting at `targetId`'s ORIGINAL index (not its post-removal index)
// naturally does this without a direction check: if targetId was to the right of draggedId, its
// original index already accounts for the slot draggedId is vacating.
function reorderColumnIds(order: string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId) return order
  const targetIndex = order.indexOf(targetId)
  if (targetIndex === -1 || order.indexOf(draggedId) === -1) return order
  const next = order.filter((id) => id !== draggedId)
  next.splice(targetIndex, 0, draggedId)
  return next
}

// Finds the column whose header is closest to `clientX`, clamping to the nearest edge column
// when the pointer overshoots past the table (e.g. dragging into the sidebar to the left of the
// leftmost header). Takes a precomputed, left-to-right-agnostic list of header rects rather than
// reading the DOM itself, so a drag's per-move hit-testing does no layout work.
function findNearestColumn(rects: { id: string; left: number; right: number }[], clientX: number): string | null {
  let closestId: string | null = null
  let closestDistance = Infinity
  for (const { id, left, right } of rects) {
    const distance = clientX < left ? left - clientX : clientX > right ? clientX - right : 0
    if (distance < closestDistance) {
      closestDistance = distance
      closestId = id
    }
  }
  return closestId
}

// Memoized and given only stable-ish props (row from TanStack's cached row model, plus a plain
// `owned` boolean) so toggling ONE row doesn't force React to re-render all ~1387 rows' cells
// (sprites, type badges, etc.) — before this, a single click took 100-270ms because the whole
// row list was recreated on every render. The "owned" cell is rendered directly here (using the
// owned/onToggle props) rather than through the column's own cell definition + flexRender,
// specifically so the column definitions never need to depend on ownedIds/toggleOwned either.
const TableRow = memo(function TableRow({
  row,
  owned,
  onToggle,
}: {
  row: Row<typeof features, PokemonEntry>
  owned: boolean
  onToggle: (slug: string) => void
  // Unread — `row.getVisibleCells()` already reflects the current visibility/order. Passed only
  // so its identity change makes `memo` re-render the row after a column show/hide/reorder, since
  // `row`'s own reference doesn't change in either case.
  columnsKey: string
}) {
  return (
    <tr
      onClick={() => onToggle(row.original.slug)}
      // No hover tint for an already-owned row — it would sit on top of and wash out the
      // owned highlight, hiding the very state the highlight exists to show.
      className={`cursor-pointer border-b border-border last:border-b-0 ${owned ? 'bg-brand/15' : 'hover:bg-border/20'}`}
    >
      {row.getVisibleCells().map((cell) =>
        cell.column.id === 'owned' ? (
          <td key={cell.id} className="p-2.5 text-center">
            <input
              type="checkbox"
              checked={owned}
              onChange={() => onToggle(row.original.slug)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Mark ${row.original.name} as owned`}
              className="cursor-pointer"
            />
          </td>
        ) : (
          <td key={cell.id} className={`p-2.5 ${COLUMN_CELL_CLASS[cell.column.id] ?? ''}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ),
      )}
    </tr>
  )
})

function HomePage() {
  const result = useDataset()
  const { activeList, toggleOwned } = useActiveList()
  const { columnVisibility, setColumnVisibility } = useColumnVisibility()
  const { columnOrder, setColumnOrder } = useColumnOrder()
  const { columnSizing, setColumnSizing } = useColumnSizing()
  const { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants } = useListFilter()
  const [tierId, setTierId] = useState<TierId>('living-form')
  // Pointer-based column drag (not native HTML5 DnD — draggable/dragstart/drop on table cells is
  // a well-documented cross-browser reliability sink hole). `columnId`/`label` identify the
  // dragged column; `hoverColumnId` is whichever header the pointer is currently over, used for
  // the drop-target highlight and as the drop target on pointerup. The preview label's on-screen
  // position is NOT in this state — it's updated imperatively (see `previewRef` below) so
  // following the cursor doesn't re-render the whole ~1387-row table on every pointermove.
  const [drag, setDrag] = useState<{ columnId: string; label: string; hoverColumnId: string } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const previewPosRef = useRef({ x: 0, y: 0 })
  const headerRefs = useRef<Record<string, HTMLTableCellElement | null>>({})

  const dataset = result.loading || result.error ? null : result.dataset
  const entries = useMemo(() => {
    if (!dataset) return []
    return Object.values(dataset.pokemon)
      .filter(applyListFilter(TIERS[tierId].predicate, filter))
      .sort((a, b) => a.sortIndex - b.sortIndex)
  }, [dataset, tierId, filter])
  const ownedIds = useMemo(() => new Set(activeList?.ownedIds ?? []), [activeList])

  // Deliberately does NOT depend on ownedIds/toggleOwned — TableRow renders the "owned" cell
  // itself from props instead of through this column's cell definition. Keeping this stable
  // (only depending on `dataset`) is what lets `rows` below stay referentially stable across
  // toggles, which is what makes the per-row React.memo above actually skip unrelated rows.
  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: 'sprite',
          header: 'Sprite',
          enableHiding: false,
          size: 72,
          minSize: 56,
          maxSize: 150,
          cell: (ctx) => (dataset ? <Sprite dataset={dataset} entry={ctx.row.original} /> : null),
        }),
        columnHelper.accessor('name', { header: 'Name', enableHiding: false, size: 200, minSize: 100, maxSize: 400 }),
        columnHelper.display({
          id: 'types',
          header: 'Types',
          enableHiding: false,
          size: 140,
          minSize: 80,
          maxSize: 250,
          cell: (ctx) => (
            <div className="flex gap-1">
              {ctx.row.original.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          ),
        }),
        columnHelper.accessor('dex', { header: 'Dex #', size: 80, minSize: 50, maxSize: 120 }),
        columnHelper.accessor('generation', { header: 'Generation', size: 100, minSize: 60, maxSize: 160 }),
        columnHelper.accessor((row) => row.region ?? '—', {
          id: 'region',
          header: 'Region',
          size: 100,
          minSize: 60,
          maxSize: 160,
        }),
        columnHelper.accessor('evolutionStage', { header: 'Stage', size: 80, minSize: 50, maxSize: 120 }),
        // Rendered directly in TableRow instead — this cell definition is never invoked, it
        // only exists so the column shows up in the header row and the visibility menu.
        columnHelper.display({
          id: 'owned',
          header: 'Owned',
          enableHiding: false,
          size: 80,
          minSize: 56,
          maxSize: 120,
          cell: () => null,
        }),
        // TanStack's ColumnDef is invariant in TValue (footer/cell templates appear in both
        // producer and consumer position), so a heterogeneous array (string/number/unknown value
        // columns mixed together) can't structurally satisfy ColumnDef<Features, Data, unknown>[]
        // even though it's fine at runtime — a standard, safe cast for this known TS limitation.
      ] as ColumnDef<typeof features, PokemonEntry, any>[],
    [dataset],
  )

  // Controlled (not `initialState`) so a preference loaded from storage after the
  // table's first render — UserStateProvider's hydration is async — still takes
  // effect; `initialState` is a one-time seed TanStack won't re-apply on its own.
  const table = useTable(
    {
      features,
      columns,
      data: entries,
      state: { columnVisibility, columnOrder, columnSizing },
      onColumnVisibilityChange: setColumnVisibility,
      onColumnOrderChange: setColumnOrder,
      onColumnSizingChange: setColumnSizing,
      // Live-updates `columnSizing` during the drag rather than only on release — cheap here
      // since widths are applied via a <colgroup> (see the header render below), not per-row
      // cell styles, so a resize never touches the ~1387-row <tbody>. `columnResizing` (the
      // transient in-progress-drag offsets) is deliberately left out of `state` — it's not
      // something to persist, unlike the committed `columnSizing` map.
      columnResizeMode: 'onChange',
    },
    (state) => ({ columnVisibility: state.columnVisibility, columnOrder: state.columnOrder, columnSizing: state.columnSizing }),
  )

  function updatePreviewPosition(x: number, y: number) {
    previewPosRef.current = { x, y }
    if (previewRef.current) {
      previewRef.current.style.left = `${x}px`
      previewRef.current.style.top = `${y}px`
    }
  }

  function handleHeaderPointerDown(columnId: string, label: string, e: ReactPointerEvent) {
    if (e.button !== 0) return
    e.preventDefault()

    // Snapshotted once per drag rather than measured on every pointermove — header positions
    // can't change mid-drag (no resizing/reflow happens until the drop), so repeated
    // getBoundingClientRect() calls on every move would just be forced-layout work for the same
    // answer, on a page with a ~1387-row table in its layout tree.
    const rects = Object.entries(headerRefs.current)
      .filter((entry): entry is [string, HTMLTableCellElement] => entry[1] !== null)
      .map(([id, el]) => {
        const rect = el.getBoundingClientRect()
        return { id, left: rect.left, right: rect.right }
      })

    updatePreviewPosition(e.clientX, e.clientY)
    setDrag({ columnId, label, hoverColumnId: columnId })

    // Tracks the last hovered column outside React state so a render is only triggered when the
    // hovered column actually changes (once per column boundary crossed), not on every pointer
    // event.
    let lastHoverId = columnId
    const controller = new AbortController()

    function onPointerMove(moveEvent: PointerEvent) {
      updatePreviewPosition(moveEvent.clientX, moveEvent.clientY)
      const overId = findNearestColumn(rects, moveEvent.clientX)
      if (overId && overId !== lastHoverId) {
        lastHoverId = overId
        setDrag((prev) => (prev ? { ...prev, hoverColumnId: overId } : prev))
      }
    }

    function endDrag(finalClientX: number | null) {
      if (finalClientX !== null) {
        const overId = findNearestColumn(rects, finalClientX)
        if (overId) setColumnOrder((current) => reorderColumnIds(current, columnId, overId))
      }
      setDrag(null)
      controller.abort()
    }

    window.addEventListener('pointermove', onPointerMove, { signal: controller.signal })
    window.addEventListener('pointerup', (upEvent) => endDrag(upEvent.clientX), { signal: controller.signal })
    // A cancelled gesture (e.g. the browser taking over for a touch scroll) still needs to clear
    // drag state and detach the listeners — without this they'd stay attached (and `endDrag`
    // would never run) for any drag that doesn't end in a plain pointerup.
    window.addEventListener('pointercancel', () => endDrag(null), { signal: controller.signal })
  }

  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide())
    .map((column) => ({
      id: column.id,
      label: typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id,
      isVisible: column.getIsVisible(),
      toggle: () => column.toggleVisibility(),
    }))

  // The single value TableRow's memo actually needs to react to: which columns are visible, and
  // in what order. A primitive so the shallow-compare that drives memoization is exact rather
  // than relying on TanStack handing back a fresh object/array identity.
  const columnsKey = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join('|')

  // Lives on HomePage itself, not just /lists, so switching lists refreshes the table right
  // here instead of requiring a trip to another page.
  return (
    <div className="flex w-full gap-6">
      <aside className="w-52 shrink-0 rounded-lg border border-border bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Lists</h2>
        <ListSwitcher />
      </aside>
      <div className="min-w-0 flex-1">
        {result.loading && <p className="text-muted">Loading Pokémon data…</p>}
        {result.error && <p className="text-muted">Failed to load dataset: {result.error.message}</p>}
        {!result.loading && !result.error && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-semibold tracking-tight">Living Dex</h1>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  Tier
                  <select
                    value={tierId}
                    onChange={(e) => setTierId(e.target.value as TierId)}
                    className="cursor-pointer rounded-md border border-border bg-background px-2.5 py-1.5 hover:border-muted"
                  >
                    {(Object.keys(TIER_LABELS) as TierId[]).map((id) => (
                      <option key={id} value={id}>
                        {TIER_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </label>
                <ColumnVisibilityMenu columns={hideableColumns} />
                <FilterMenu
                  toggles={[
                    { id: 'finalStageOnly', label: 'Final stage only', checked: filter.finalStageOnly, toggle: toggleFinalStageOnly },
                    { id: 'regionalFormsOnly', label: 'Regional forms only', checked: filter.regionalFormsOnly, toggle: toggleRegionalFormsOnly },
                    { id: 'hideGenderVariants', label: 'Hide gender variants', checked: filter.hideGenderVariants, toggle: toggleHideGenderVariants },
                  ]}
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full table-fixed border-collapse text-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <colgroup key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <col key={header.id} style={{ width: header.getSize() }} />
                    ))}
                  </colgroup>
                ))}
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-surface text-left">
                      {headerGroup.headers.map((header, index) => {
                        const isDragging = drag?.columnId === header.column.id
                        const isDropTarget = drag !== null && drag.hoverColumnId === header.column.id && !isDragging
                        const isLastHeader = index === headerGroup.headers.length - 1
                        const headerLabel =
                          typeof header.column.columnDef.header === 'string'
                            ? header.column.columnDef.header
                            : header.column.id
                        return (
                          <th
                            key={header.id}
                            ref={(el) => {
                              headerRefs.current[header.column.id] = el
                            }}
                            // Draggable from anywhere on the header, not just the grip icon — the
                            // icon is a visual affordance, not the only hit target.
                            onPointerDown={(e) => handleHeaderPointerDown(header.column.id, headerLabel, e)}
                            className={`relative cursor-grab p-2.5 text-xs font-semibold tracking-wide text-muted uppercase select-none active:cursor-grabbing ${
                              isDragging ? 'opacity-30' : ''
                            } ${isDropTarget ? 'bg-brand/10' : ''} ${COLUMN_CELL_CLASS[header.column.id] ?? ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted">⠿</span>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                            {!isLastHeader && (
                              <div
                                onMouseDown={(e) => {
                                  e.stopPropagation()
                                  header.getResizeHandler()(e.nativeEvent)
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation()
                                  header.getResizeHandler()(e.nativeEvent)
                                }}
                                // Visible at rest (per the request — not just on hover), brand-colored
                                // and slightly wider while actively resizing this column.
                                className={`absolute top-0 right-0 h-full cursor-col-resize touch-none select-none ${
                                  header.column.getIsResizing() ? 'w-1.5 bg-brand' : 'w-1 bg-border'
                                }`}
                                // `aria-hidden` rather than a labelled role: a mouse/touch-only
                                // drag handle has no keyboard interaction to expose, and giving it
                                // its own `aria-label` would otherwise get folded into the parent
                                // `<th>`'s accessible name (breaking `getByRole('columnheader', {
                                // name: ... })` lookups elsewhere in this file and in tests).
                                aria-hidden="true"
                                data-testid={`resize-handle-${header.column.id}`}
                              />
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      owned={ownedIds.has(row.original.slug)}
                      onToggle={toggleOwned}
                      columnsKey={columnsKey}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {drag &&
        createPortal(
          <div
            ref={previewRef}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase shadow-lg"
            style={{ left: previewPosRef.current.x, top: previewPosRef.current.y }}
          >
            {drag.label}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default HomePage
