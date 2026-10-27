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
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  type ColumnDef,
  type Row,
  type SortingState,
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
import { getColumnMinPx, getColumnWeight, resizeAdjacentPair } from '../lib/columnWeights'

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
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

// `box`/`slot` are derived from the filtered, canonical-`sortIndex`-ordered list (see `entries`
// below), never from the order the table currently displays.
type TableEntry = PokemonEntry & { box: number; slot: number }
const BOX_SIZE = 30
// A header press that moves less than this before release is a click (sort), not a reorder drag.
const CLICK_MOVE_THRESHOLD_PX = 4
const columnHelper = createColumnHelper<typeof features, TableEntry>()

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
  box: 'text-left',
  slot: 'text-left',
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
    <div className="w-full">
      {/* Scales down with the column when it's resized (3.8f follow-up) — capped at SPRITE_SIZE
          as its natural/maximum size, the same "shrink to fit, capped at a max" rule any image
          cell would get, rather than sprite-specific logic. */}
      <img
        ref={imgRef}
        src={spriteUrl}
        alt=""
        loading="lazy"
        onError={handleError}
        onMouseEnter={() => setHoverRect(imgRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setHoverRect(null)}
        className="block h-auto w-full object-contain"
        style={{ maxWidth: SPRITE_SIZE }}
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
  row: Row<typeof features, TableEntry>
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
          <td key={cell.id} className={`overflow-hidden p-2.5 ${COLUMN_CELL_CLASS[cell.column.id] ?? ''}`}>
            {/* Truncates instead of overflowing into the next column when a resize (3.8f) shrinks
                this column below its content's natural width. `block` so `text-overflow: ellipsis`
                actually applies — a plain inline `span` doesn't respect it. Harmless for non-text
                cells (Sprite's image, Types' row of badges): `overflow-hidden` alone clips those. */}
            <span className="block truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
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
  const tableRef = useRef<HTMLTableElement>(null)
  // Not persisted: the spec is that the table always opens sorted by Dex ascending.
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dex', desc: false }])
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null)

  const dataset = result.loading || result.error ? null : result.dataset
  const entries = useMemo(() => {
    if (!dataset) return []
    return Object.values(dataset.pokemon)
      .filter(applyListFilter(TIERS[tierId].predicate, filter))
      .sort((a, b) => a.sortIndex - b.sortIndex)
      // Position in the canonical order, baked into each row's data before the table (and its
      // display sorting) ever sees it — so re-sorting can never change a Pokémon's Box/Slot.
      .map((entry, index) => ({ ...entry, box: Math.floor(index / BOX_SIZE) + 1, slot: (index % BOX_SIZE) + 1 }))
  }, [dataset, tierId, filter])
  const ownedIds = useMemo(() => new Set(activeList?.ownedIds ?? []), [activeList])

  // Deliberately does NOT depend on ownedIds/toggleOwned — TableRow renders the "owned" cell
  // itself from props instead of through this column's cell definition. Keeping this stable
  // (only depending on `dataset`) is what lets `rows` below stay referentially stable across
  // toggles, which is what makes the per-row React.memo above actually skip unrelated rows.
  const columns = useMemo(
    () =>
      [
        // Widths live in DEFAULT_COLUMN_WEIGHTS / `columnSizing`, not here. Content within each
        // cell (text, the sprite image, type badges) shrinks/truncates/wraps itself down to a
        // narrow column via generic CSS (see `Sprite`, the Types cell, and TableRow's shared
        // `overflow-hidden`/`truncate` wrapper) rather than any column-specific logic here.
        columnHelper.display({
          id: 'sprite',
          header: 'Sprite',
          enableHiding: false,
          cell: (ctx) => (dataset ? <Sprite dataset={dataset} entry={ctx.row.original} /> : null),
        }),
        columnHelper.accessor('name', { header: 'Name', enableHiding: false, sortFn: sortFn_alphanumeric }),
        columnHelper.display({
          id: 'types',
          header: 'Types',
          enableHiding: false,
          cell: (ctx) => (
            <div className="flex flex-wrap gap-1">
              {ctx.row.original.types.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          ),
        }),
        columnHelper.accessor('dex', { header: 'Dex', sortFn: sortFn_alphanumeric }),
        columnHelper.accessor('box', { header: 'Box', enableSorting: false }),
        columnHelper.accessor('slot', { header: 'Slot', enableSorting: false }),
        // Numbers default to descending-first; ascending matches how every other column starts.
        columnHelper.accessor('generation', { header: 'Generation', sortFn: sortFn_basic, sortDescFirst: false }),
        columnHelper.accessor((row) => row.region ?? '—', {
          id: 'region',
          header: 'Region',
          sortFn: sortFn_alphanumeric,
        }),
        columnHelper.accessor('evolutionStage', { header: 'Stage', enableSorting: false }),
        // Rendered directly in TableRow instead — this cell definition is never invoked, it
        // only exists so the column shows up in the header row and the visibility menu.
        columnHelper.display({
          id: 'owned',
          header: 'Owned',
          enableHiding: false,
          cell: () => null,
        }),
        // TanStack's ColumnDef is invariant in TValue (footer/cell templates appear in both
        // producer and consumer position), so a heterogeneous array (string/number/unknown value
        // columns mixed together) can't structurally satisfy ColumnDef<Features, Data, unknown>[]
        // even though it's fine at runtime — a standard, safe cast for this known TS limitation.
      ] as ColumnDef<typeof features, TableEntry, any>[],
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
      state: { columnVisibility, columnOrder, sorting },
      onColumnVisibilityChange: setColumnVisibility,
      onColumnOrderChange: setColumnOrder,
      onSortingChange: setSorting,
      // Always exactly one sorted column (toggle is asc <-> desc), never an "unsorted" state.
      enableSortingRemoval: false,
    },
    // v9 only re-renders for the state slices selected here — `sorting` must be one of them.
    (state) => ({ columnVisibility: state.columnVisibility, columnOrder: state.columnOrder, sorting: state.sorting }),
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

    // Same browser quirk as the resize handle below: the CSS cursor freezes to whatever was
    // under the pointer at `pointerdown` and isn't re-evaluated against new elements while the
    // button stays down, so the header's own `cursor-grab`/`active:cursor-grabbing` classes
    // don't reliably track the drag as the pointer crosses other headers/rows. Forcing it on
    // `document.body` for the drag's duration fixes it the same way.
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

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

    function endDrag(finalClientX: number | null, finalClientY: number | null = null) {
      const moved =
        finalClientX === null || finalClientY === null
          ? true
          : Math.hypot(finalClientX - e.clientX, finalClientY - e.clientY) >= CLICK_MOVE_THRESHOLD_PX
      const column = table.getColumn(columnId)
      if (!moved && column?.getCanSort()) {
        // A press-and-release without moving is a click, not a reorder drag.
        column.toggleSorting()
      } else if (finalClientX !== null) {
        const overId = findNearestColumn(rects, finalClientX)
        if (overId) setColumnOrder((current) => reorderColumnIds(current, columnId, overId))
      }
      setDrag(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      controller.abort()
    }

    window.addEventListener('pointermove', onPointerMove, { signal: controller.signal })
    window.addEventListener('pointerup', (upEvent) => endDrag(upEvent.clientX, upEvent.clientY), { signal: controller.signal })
    // A cancelled gesture (e.g. the browser taking over for a touch scroll) still needs to clear
    // drag state and detach the listeners — without this they'd stay attached (and `endDrag`
    // would never run) for any drag that doesn't end in a plain pointerup.
    window.addEventListener('pointercancel', () => endDrag(null), { signal: controller.signal })
  }

  // Dragging the divider between two adjacent columns moves the boundary: the left column
  // grows by what the right one loses (see lib/columnWeights.ts). Pointer Events cover mouse,
  // touch and pen in one path; pointer capture keeps moves coming when the cursor leaves the
  // handle, so no window listeners are needed.
  function handleResizePointerDown(leftId: string, rightId: string, e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const tablePx = tableRef.current?.getBoundingClientRect().width ?? 0
    const startX = e.clientX
    const startLeft = getColumnWeight(columnSizing, leftId)
    const startRight = getColumnWeight(columnSizing, rightId)
    const sum = visibleWeightSum
    const handle = e.currentTarget
    const pointerId = e.pointerId

    // Optional call: jsdom (tests) doesn't implement pointer capture.
    handle.setPointerCapture?.(pointerId)
    setResizingColumnId(leftId)
    // The browser freezes the CSS cursor to whatever was under the pointer at pointerdown, so it
    // is forced on <body> for the duration of the drag.
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const controller = new AbortController()

    function onMove(moveEvent: PointerEvent) {
      const { left, right } = resizeAdjacentPair({
        leftWeight: startLeft,
        rightWeight: startRight,
        visibleWeightSum: sum,
        tablePx,
        deltaPx: moveEvent.clientX - startX,
        leftMinPx: getColumnMinPx(leftId),
        rightMinPx: getColumnMinPx(rightId),
      })
      setColumnSizing((prev) => ({ ...prev, [leftId]: left, [rightId]: right }))
    }

    function end() {
      setResizingColumnId(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      controller.abort()
    }

    handle.addEventListener('pointermove', onMove, { signal: controller.signal })
    handle.addEventListener('pointerup', end, { signal: controller.signal })
    handle.addEventListener('pointercancel', end, { signal: controller.signal })
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

  const visibleColumnIds = (table.getHeaderGroups()[0]?.headers ?? []).map((header) => header.column.id)
  const visibleWeightSum = visibleColumnIds.reduce((sum, id) => sum + getColumnWeight(columnSizing, id), 0)

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
            {/* Column widths are percentages that always sum to 100% (see lib/columnWeights.ts), so
                the table can never be wider or narrower than its container — nothing to scroll. */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table ref={tableRef} className="w-full table-fixed border-collapse text-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <colgroup key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <col
                        key={header.id}
                        style={{ width: `${(getColumnWeight(columnSizing, header.column.id) / visibleWeightSum) * 100}%` }}
                      />
                    ))}
                  </colgroup>
                ))}
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-surface text-left">
                      {headerGroup.headers.map((header, index) => {
                        const nextHeader = headerGroup.headers[index + 1]
                        const isDragging = drag?.columnId === header.column.id
                        const isDropTarget = drag !== null && drag.hoverColumnId === header.column.id && !isDragging
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
                            aria-sort={
                              header.column.getIsSorted() === 'asc'
                                ? 'ascending'
                                : header.column.getIsSorted() === 'desc'
                                  ? 'descending'
                                  : undefined
                            }
                            title={header.column.getCanSort() ? 'Click to sort' : undefined}
                            className={`relative cursor-grab overflow-hidden p-2.5 text-xs font-semibold tracking-wide text-muted uppercase select-none active:cursor-grabbing ${
                              isDragging ? 'opacity-30' : ''
                            } ${isDropTarget ? 'bg-brand/10' : ''} ${COLUMN_CELL_CLASS[header.column.id] ?? ''}`}
                          >
                            <div className="flex min-w-0 items-center gap-1">
                              <span className="shrink-0 text-xs text-muted">⠿</span>
                              {/* Truncates instead of overflowing into the next header when a
                                  resize (3.8f) shrinks this column below the label's width. */}
                              <span className="truncate">
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {/* `aria-hidden` — `aria-sort` on the `<th>` already conveys this, and a
                                  visible-text arrow would change the header's accessible name. */}
                              {header.column.getIsSorted() && (
                                <span aria-hidden="true" className="shrink-0 text-[10px] text-brand">
                                  {header.column.getIsSorted() === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                            {/* The divider between this column and the next visible one — the last column
                                has none, since the table's right edge isn't a boundary between two
                                columns. */}
                            {nextHeader && (
                              <div
                                // `pointerdown` reaches the `<th>` first, whose own handler starts a
                                // column REORDER drag — stop it here so a resize never becomes one.
                                onPointerDown={(e) =>
                                  handleResizePointerDown(header.column.id, nextHeader.column.id, e)
                                }
                                // Wide hit area (the visible line below is only 1px) so it's easy to
                                // grab; kept inside the `<th>` because the `<th>` is overflow-hidden.
                                className="absolute top-0 right-0 z-10 h-full w-3 cursor-col-resize touch-none select-none"
                                // `aria-hidden`: a pointer-only handle has no keyboard interaction, and an
                                // `aria-label` would get folded into the `<th>`'s accessible name.
                                aria-hidden="true"
                                data-testid={`resize-handle-${header.column.id}`}
                              >
                                <div
                                  className={`pointer-events-none absolute top-0 right-0 h-full ${
                                    resizingColumnId === header.column.id ? 'w-1 bg-brand' : 'w-px bg-border'
                                  }`}
                                />
                              </div>
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
