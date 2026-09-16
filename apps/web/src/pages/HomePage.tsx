import {
  applyListFilter,
  getPokeJungleSpriteUrl,
  getSpriteUrl,
  type PokemonEntry,
  type PokemonDataset,
} from '@living-dex/business-logic'
import { TIERS, type TierId } from '@cmodernel/living-dex-tiers'
import { flexRender, useTable } from '@tanstack/react-table'
import { columnOrderingFeature, columnVisibilityFeature, createColumnHelper, tableFeatures, type ColumnDef, type Row } from '@tanstack/table-core'
import { memo, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu'
import FilterMenu from '../components/FilterMenu'
import ListSwitcher from '../components/ListSwitcher'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
import { useColumnOrder } from '../hooks/useColumnOrder'
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
const features = tableFeatures({ columnVisibilityFeature, columnOrderingFeature })
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
  // Not read directly — including it in props (a new object/array each time visibility or order
  // changes) is what makes memo correctly re-render when either one changes. `row`'s own
  // reference doesn't change in either case (only data/columns changes affect the row model), so
  // without these, memo would wrongly skip re-rendering rows after a column show/hide/reorder —
  // this bit column *order* specifically: `row.getVisibleCells()` already reflects `columnOrder`
  // correctly once actually called (confirmed in the installed package's own source —
  // `columnOrderingFeature` patches `table.getAllLeafColumns()`, which every leaf-column accessor
  // builds on), but with no order-derived prop, dragging a column changed the header (rendered
  // directly in HomePage, not memoized) while every row silently kept rendering its old cell
  // order, since none of TableRow's shallow-compared props had changed identity.
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
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
  const { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants } = useListFilter()
  const [tierId, setTierId] = useState<TierId>('living-form')
  // Pointer-based column drag (not native HTML5 DnD — draggable/dragstart/drop on table cells is
  // a well-documented cross-browser reliability sink hole). `draggedColumnId` is the column being
  // dragged; `hoverColumnId` is whichever header the pointer is currently over, used both for the
  // drop-target highlight and as the actual drop target on pointerup. `dragPreview` drives the
  // floating label that follows the cursor while dragging (native HTML5 DnD's default drag-ghost
  // equivalent, since Pointer Events don't provide one for free).
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [hoverColumnId, setHoverColumnId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ label: string; x: number; y: number } | null>(null)
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
          cell: (ctx) => (dataset ? <Sprite dataset={dataset} entry={ctx.row.original} /> : null),
        }),
        columnHelper.accessor('name', { header: 'Name', enableHiding: false }),
        columnHelper.display({
          id: 'types',
          header: 'Types',
          enableHiding: false,
          cell: (ctx) => (
            <div className="flex gap-1">
              {ctx.row.original.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          ),
        }),
        columnHelper.accessor('dex', { header: 'Dex #' }),
        columnHelper.accessor('generation', { header: 'Generation' }),
        columnHelper.accessor((row) => row.region ?? '—', { id: 'region', header: 'Region' }),
        columnHelper.accessor('evolutionStage', { header: 'Stage' }),
        // Rendered directly in TableRow instead — this cell definition is never invoked, it
        // only exists so the column shows up in the header row and the visibility menu.
        columnHelper.display({ id: 'owned', header: 'Owned', enableHiding: false, cell: () => null }),
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
      state: { columnVisibility, columnOrder },
      onColumnVisibilityChange: setColumnVisibility,
      onColumnOrderChange: setColumnOrder,
    },
    (state) => ({ columnVisibility: state.columnVisibility, columnOrder: state.columnOrder }),
  )

  // Finalizes a column drag: reorders `columnOrder` so `draggedId` ends up adjacent to `targetId`,
  // on the side matching the drag's direction. Computed against `table.state.columnOrder`
  // directly — the persisted full order, not just the currently-visible subset — so a hidden
  // column's position is preserved.
  //
  // Direction matters, not just "insert before target": always inserting before the target is a
  // no-op whenever the target is the dragged column's IMMEDIATE right neighbor — removing the
  // dragged column shifts the target left by exactly one slot, so re-inserting it "before" the
  // (now-shifted) target lands it right back where it started. That's why a one-step rightward
  // nudge (the most common real drag gesture) silently did nothing, while the same one-step
  // leftward nudge worked (there, "insert before target" is a genuine swap). Inserting after the
  // target when dragging rightward (and before it when dragging leftward) fixes this: the dragged
  // column always ends up on the far side of the target from where it started.
  function reorderColumns(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const current = table.state.columnOrder
    const draggedIndex = current.indexOf(draggedId)
    const targetIndex = current.indexOf(targetId)
    if (draggedIndex === -1 || targetIndex === -1) return
    const movingRight = draggedIndex < targetIndex
    const next = current.filter((id) => id !== draggedId)
    const targetIndexInNext = next.indexOf(targetId)
    const insertIndex = movingRight ? targetIndexInNext + 1 : targetIndexInNext
    next.splice(insertIndex, 0, draggedId)
    setColumnOrder(next)
  }

  // A single window-level listener drives the whole drag once started (pointer capture keeps
  // firing pointermove on the header even once the cursor leaves it, which per-header handlers
  // alone wouldn't get). Compares the pointer's X position against each header's own
  // getBoundingClientRect() rather than `document.elementFromPoint`, since the hover-tooltip
  // portal (Sprite) can sit on top of the table and would otherwise intercept hit-testing.
  function handleHeaderPointerDown(columnId: string, label: string, e: ReactPointerEvent) {
    // Ignore drags started from an interactive control inside the header (none exist today, but
    // this keeps the whole-header drag area from swallowing clicks on anything added later, e.g.
    // a future sort toggle) — only left-button presses start a drag.
    if (e.button !== 0) return
    e.preventDefault()
    setDraggedColumnId(columnId)
    setHoverColumnId(columnId)
    setDragPreview({ label, x: e.clientX, y: e.clientY })

    // Clamps to the nearest edge column when the pointer overshoots past the table (e.g.
    // dragging into the sidebar to the left of the leftmost header, or past the right edge) —
    // without this, a natural "drag all the way to the start/end" gesture landed outside every
    // header's exact rect and silently found no drop target, aborting the reorder. This is why
    // dragging left (toward the sidebar) looked broken while dragging right (toward more table)
    // did not: there's much less room to overshoot on the right before running out of viewport.
    function findColumnUnderPointer(clientX: number): string | null {
      const entries = Object.entries(headerRefs.current).filter(
        (entry): entry is [string, HTMLTableCellElement] => entry[1] !== null,
      )
      if (entries.length === 0) return null
      let closestId: string | null = null
      let closestDistance = Infinity
      for (const [id, el] of entries) {
        const rect = el.getBoundingClientRect()
        if (clientX >= rect.left && clientX <= rect.right) return id
        const distance = clientX < rect.left ? rect.left - clientX : clientX - rect.right
        if (distance < closestDistance) {
          closestDistance = distance
          closestId = id
        }
      }
      return closestId
    }

    function onPointerMove(moveEvent: PointerEvent) {
      const overId = findColumnUnderPointer(moveEvent.clientX)
      if (overId) setHoverColumnId(overId)
      setDragPreview((prev) => (prev ? { ...prev, x: moveEvent.clientX, y: moveEvent.clientY } : prev))
    }

    function onPointerUp(upEvent: PointerEvent) {
      const overId = findColumnUnderPointer(upEvent.clientX)
      if (overId) reorderColumns(columnId, overId)
      setDraggedColumnId(null)
      setHoverColumnId(null)
      setDragPreview(null)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
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
              <table className="w-full border-collapse text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-surface text-left">
                      {headerGroup.headers.map((header) => {
                        const isDragging = draggedColumnId === header.column.id
                        const isDropTarget =
                          hoverColumnId === header.column.id && draggedColumnId !== null && !isDragging
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
                            className={`cursor-grab p-2.5 text-xs font-semibold tracking-wide text-muted uppercase select-none active:cursor-grabbing ${
                              isDragging ? 'opacity-30' : ''
                            } ${isDropTarget ? 'bg-brand/10' : ''} ${COLUMN_CELL_CLASS[header.column.id] ?? ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted">⠿</span>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
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
                      columnVisibility={table.state.columnVisibility}
                      columnOrder={table.state.columnOrder}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {dragPreview &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-surface px-3 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase shadow-lg"
            style={{ left: dragPreview.x, top: dragPreview.y }}
          >
            {dragPreview.label}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default HomePage
