import {
  GAMES,
  applyListFilter,
  evaluateTrophies,
  ownedProgress,
  availableGames,
  getAvailabilityCategory,
  getOwnedGames,
  getPokeJungleSpriteUrl,
  getSpriteUrl,
  effectiveLayoutTier,
  layoutPositions,
  resolveListTiers,
  type PokemonEntry,
  type PokemonDataset,
} from '@living-dex/business-logic'
import { TIERS } from '@cmodernel/living-dex-tiers'
import type { TierId } from '@living-dex/business-logic'
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
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu'
import FilterMenu from '../components/FilterMenu'
import GamePickerPopover, { type GamePickerOption } from '../components/GamePickerPopover'
import ListSwitcher from '../components/ListSwitcher'
import StartWizard from '../components/StartWizard'
import TierCards from '../components/TierCards'
import TierChangeDialog from '../components/TierChangeDialog'
import Dialog from '../components/Dialog'
import OwnedProgress from '../components/OwnedProgress'
import TrophiesPanel from '../components/TrophiesPanel'
import WelcomeCard from '../components/WelcomeCard'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
import { useIsHydrated, useUserState } from '../state/UserStateContext'
import { useLists } from '../hooks/useLists'
import { TIER_LABELS, TROPHY_TIER_ORDER, useTierSets } from '../lib/tiers'
import { useColumnOrder } from '../hooks/useColumnOrder'
import { useColumnSizing } from '../hooks/useColumnSizing'
import { useColumnVisibility } from '../hooks/useColumnVisibility'
import { useDataset } from '../hooks/useDataset'
import { useGameSelection } from '../hooks/useGameSelection'
import { useListFilter } from '../hooks/useListFilter'
import { getColumnMinPx, getColumnWeight, resizeAdjacentPair } from '../lib/columnWeights'

// Module-level: no runtime data dependency, must stay stable across renders.
const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
})

// `box`/`slot` are the position in the list's layout tier (3.19, see `entries` below), computed from the
// full dataset before any filter, never from the order the table currently displays. `availableIn` is the selected games
// (3.8d) where the entry is obtainable or conditional — null when the dataset has no availability
// data for it — and `selectedGameCount` the denominator shown next to it.
type TableEntry = PokemonEntry & { box: number; slot: number; availableIn: string[] | null; selectedGameCount: number }
// A header press that moves less than this before release is a click (sort), not a reorder drag.
const CLICK_MOVE_THRESHOLD_PX = 4
const columnHelper = createColumnHelper<typeof features, TableEntry>()

const GAME_NAMES: Record<string, string> = Object.fromEntries(GAMES.map((game) => [game.id, game.name]))

// Opens (or, from the same trigger, closes) the 3.7b "obtained from" picker for an entry. Passed
// through context rather than props so the cells inside the stable `columns` memo and the memoized
// TableRow can reach it without depending on any state. The value never changes identity.
const GamePickerContext = createContext<(slug: string, anchor: HTMLElement) => void>(() => {})

// Tap/click opens the game picker — the hover `title` is a desktop extra, since touch has no hover.
function AvailabilityCell({ entry }: { entry: TableEntry }) {
  const openGamePicker = useContext(GamePickerContext)
  if (entry.availableIn === null) return <span title="No availability data">—</span>
  const title =
    entry.availableIn.length === 0
      ? 'Not obtainable in the selected games'
      : entry.availableIn
          .map((id) => `${GAME_NAMES[id] ?? id}${getAvailabilityCategory(entry, id) === 'conditional' ? ' (conditional)' : ''}`)
          .join(', ')
  return (
    <button
      type="button"
      title={title}
      aria-label={`Availability of ${entry.name}: ${entry.availableIn.length} of ${entry.selectedGameCount} games`}
      onClick={(e) => {
        e.stopPropagation()
        openGamePicker(entry.slug, e.currentTarget)
      }}
      className="cursor-pointer rounded px-1 underline decoration-dotted underline-offset-2 hover:bg-border/40"
    >
      {entry.availableIn.length} / {entry.selectedGameCount}
    </button>
  )
}

// The hover tooltip keeps this same zoom ratio relative to the base size — bump SPRITE_SIZE
// alone to resize both consistently.
const SPRITE_SIZE = 56
const SPRITE_HOVER_ZOOM = 2

// Per-column cell styling that a plain accessor column can't express on its own (text
// alignment, and capitalizing Region/Stage's raw lowercase slugs — display-only, the
// underlying data stays untouched). Centralized here so both the header `<th>` and body
// `<td>` pull from the same source and can't drift apart.
const COLUMN_CELL_CLASS: Record<string, string> = {
  position: 'text-left',
  dex: 'text-left',
  box: 'text-left',
  slot: 'text-left',
  generation: 'text-center',
  availability: 'text-center',
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

// Color handheld for the "obtained from" button: purple when no game is tagged, brand blue when
// some are, so it reads as a pressable control rather than a plain icon.
function GameIcon({ active }: { active: boolean }) {
  const body = active ? '#208aef' : '#6C3FC4'
  const edge = active ? '#0C447C' : '#3C2078'
  return (
    <svg viewBox="0 0 22 26" width="18" height="21" aria-hidden="true">
      <rect x="1" y="1" width="20" height="24" rx="3" fill={body} stroke={edge} />
      <rect x="4" y="4" width="14" height="10" rx="1.5" fill="#B9E3C6" stroke={edge} />
      <path d="M6 19h4M8 17v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15" cy="18" r="1.6" fill="#fff" />
      <circle cx="17.5" cy="20.5" r="1.6" fill="#fff" />
    </svg>
  )
}

// Only entries WITH availability data can be inaccessible; missing data isn't "unobtainable".
function isInaccessible(entry: TableEntry): boolean {
  return entry.availableIn !== null && entry.availableIn.length === 0
}

// Memoized and given only stable-ish props (row from TanStack's cached row model, plus a plain
// `owned` boolean) so toggling ONE row doesn't force React to re-render all ~1387 rows' cells
// (sprites, type badges, etc.) — before this, a single click took 100-270ms because the whole
// row list was recreated on every render. The "owned" cell is rendered directly here (using the
// owned/onToggle props) rather than through the column's own cell definition + flexRender,
// specifically so the column definitions never need to depend on ownedIds/toggleOwned either.
const TableRow = memo(function TableRow({
  row,
  position,
  owned,
  ownedGames,
  pickerOpen,
  onToggle,
}: {
  row: Row<typeof features, TableEntry>
  // 1-based place in the list as currently displayed (filtered + sorted), for the "#" column.
  // Rendered here, not baked into `entries`, so it follows sorting while Box/Slot never do.
  position: number
  owned: boolean
  // 3.7b: games this entry is tagged as obtained from. Same array identity until this entry's tags
  // change (see owned.ts), so tagging one row doesn't re-render the others.
  ownedGames: readonly string[]
  // Whether the game picker is currently open from this row's button (for aria-expanded).
  pickerOpen: boolean
  onToggle: (slug: string) => void
  // Unread — `row.getVisibleCells()` already reflects the current visibility/order. Passed only
  // so its identity change makes `memo` re-render the row after a column show/hide/reorder, since
  // `row`'s own reference doesn't change in either case.
  columnsKey: string
}) {
  const openGamePicker = useContext(GamePickerContext)
  return (
    <tr
      onClick={() => onToggle(row.original.slug)}
      // No hover tint for an already-owned row — it would sit on top of and wash out the
      // owned highlight, hiding the very state the highlight exists to show.
      // 3.8e: inaccessible (obtainable in none of the selected games) rows are muted and their
      // sprites desaturated, so they stay in the list but read as "not for you" at a glance.
      className={`cursor-pointer border-b border-border last:border-b-0 ${owned ? 'bg-brand/15' : 'hover:bg-border/20'} ${isInaccessible(row.original) ? 'text-muted [&_img]:grayscale' : ''}`}
    >
      {row.getVisibleCells().map((cell) =>
        cell.column.id === 'owned' ? (
          <td key={cell.id} className="overflow-hidden p-2.5">
            <div className="flex items-center justify-center gap-1.5">
              <input
                type="checkbox"
                checked={owned}
                onChange={() => onToggle(row.original.slug)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Mark ${row.original.name} as owned`}
                className="cursor-pointer"
              />
              {/* Owned + which game(s) it came from (3.7b) — the row click above is "owned, no game". */}
              <button
                type="button"
                aria-label={`Obtained from games for ${row.original.name}`}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                title={
                  ownedGames.length > 0
                    ? `Obtained from: ${ownedGames.map((id) => GAME_NAMES[id] ?? id).join(', ')}`
                    : 'Pick the game(s) it was obtained from'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  openGamePicker(row.original.slug, e.currentTarget)
                }}
                className={`flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border px-1.5 py-0.5 text-xs font-medium shadow-sm transition hover:brightness-95 active:translate-y-px active:shadow-none ${
                  ownedGames.length > 0
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border bg-background text-muted hover:border-foreground/30'
                }`}
              >
                <GameIcon active={ownedGames.length > 0} />
                {ownedGames.length > 0 && <span>{ownedGames.length}</span>}
                <svg viewBox="0 0 10 6" width="8" height="5" aria-hidden="true" className="hidden sm:block" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </td>
        ) : cell.column.id === 'position' ? (
          <td key={cell.id} className={`overflow-hidden p-2.5 ${COLUMN_CELL_CLASS.position}`}>
            {position}
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
  const { activeList, toggleOwned, toggleOwnedGame } = useActiveList()
  const { columnVisibility, setColumnVisibility, resetColumns } = useColumnVisibility()
  const { columnOrder, setColumnOrder } = useColumnOrder()
  const { columnSizing, setColumnSizing } = useColumnSizing()
  const { filter, toggleFinalStageOnly, toggleRegionalFormsOnly, toggleHideGenderVariants, toggleHideInaccessible } =
    useListFilter()
  const { selectedGameIds, toggleGame, selectAllGames, selectNoGames } = useGameSelection()
  const hydrated = useIsHydrated()
  const { updateList, cloneList } = useLists()
  const { tier: tierId, layoutTier } = resolveListTiers(activeList)
  const [pendingTier, setPendingTier] = useState<TierId | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [tierGuideOpen, setTierGuideOpen] = useState(false)
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
  const tierSets = useTierSets(dataset)
  // 3.19: Box/Slot = position in the layout tier's full order, computed before filters and games, so
  // neither (nor re-sorting) can move it. Falls back to the working tier when the layout doesn't hold it.
  const layoutTierUsed = tierSets ? effectiveLayoutTier(tierSets, tierId, layoutTier) : tierId
  const positions = useMemo(
    () => (dataset ? layoutPositions(Object.values(dataset.pokemon), TIERS[layoutTierUsed].predicate) : new Map()),
    [dataset, layoutTierUsed],
  )
  const entries = useMemo(() => {
    if (!dataset) return []
    return Object.values(dataset.pokemon)
      .filter(applyListFilter(TIERS[tierId].predicate, filter, selectedGameIds))
      .sort((a, b) => a.sortIndex - b.sortIndex)
      .map((entry) => ({
        ...entry,
        box: positions.get(entry.slug)?.box ?? 0,
        slot: positions.get(entry.slug)?.slot ?? 0,
        availableIn: entry.availability ? availableGames(entry, selectedGameIds) : null,
        selectedGameCount: selectedGameIds.length,
      }))
  }, [dataset, tierId, filter, selectedGameIds, positions])

  function changeTier(next: TierId) {
    if (!activeList || next === tierId) return
    if (!tierSets || effectiveLayoutTier(tierSets, next, layoutTier) === layoutTier) {
      updateList(activeList.id, { tier: next, layoutTier })
    } else setPendingTier(next)
  }
  const ownedIds = useMemo(() => new Set(activeList?.ownedIds ?? []), [activeList])
  const [userState, setUserState] = useUserState()
  const dismissWelcome = useCallback(
    () => setUserState((prev) => ({ ...prev, preferences: { ...prev.preferences, welcomeDismissed: true } })),
    [setUserState],
  )
  const progress = useMemo(() => ownedProgress(entries, ownedIds), [entries, ownedIds])
  // Trophies use the FULL entry set of every tier (smallest first = lowest rank), never the
  // filtered `entries`, so display filters and the tier dropdown can't move a medal.
  const trophyTiers = useMemo(() => {
    if (!dataset) return []
    const all = Object.values(dataset.pokemon)
    return TROPHY_TIER_ORDER.map((id) => ({ id, name: TIER_LABELS[id], entries: all.filter(TIERS[id].predicate) }))
  }, [dataset])
  const trophies = useMemo(() => evaluateTrophies(trophyTiers, ownedIds), [trophyTiers, ownedIds])
  const entriesBySlug = useMemo(() => new Map(entries.map((entry) => [entry.slug, entry])), [entries])

  // 3.7b "obtained from" picker: which entry it's open for, and the element it's anchored to.
  const [picker, setPicker] = useState<{ slug: string; anchor: HTMLElement } | null>(null)
  const toggleGamePicker = useCallback(
    (slug: string, anchor: HTMLElement) => setPicker((prev) => (prev?.anchor === anchor ? null : { slug, anchor })),
    [],
  )
  const closeGamePicker = useCallback(() => setPicker(null), [])
  // Undefined (so nothing renders) if its entry was filtered out while open. Any other way of
  // changing the table (hiding a column, switching list/tier) starts with a tap outside the
  // popover, which already closes it.
  const pickerEntry = picker ? entriesBySlug.get(picker.slug) : undefined
  const pickerOptions = useMemo((): GamePickerOption[] => {
    if (!pickerEntry) return []
    const tagged = getOwnedGames(activeList, pickerEntry.slug)
    const accessible = new Set(pickerEntry.availableIn ?? [])
    // Only accessible games are offered, plus any already-tagged game that no longer is (e.g. it
    // was deselected in Filters) — tags are a historical record, kept until unticked here.
    return GAMES.filter((game) => accessible.has(game.id) || tagged.includes(game.id)).map((game) => ({
      id: game.id,
      name: game.name,
      note: !accessible.has(game.id)
        ? 'not in selection'
        : getAvailabilityCategory(pickerEntry, game.id) === 'conditional'
          ? 'conditional'
          : undefined,
      checked: tagged.includes(game.id),
    }))
  }, [pickerEntry, activeList])

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
        // Bare species name without the form suffix (e.g. "Raichu" for "Raichu (Alolan)").
        columnHelper.accessor('species', { header: 'Species', sortFn: sortFn_alphanumeric }),
        columnHelper.display({
          id: 'types',
          header: 'Types',
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
        // Place in the displayed list (see TableRow's `position`); the cell is rendered there, so
        // this definition only supplies the header and the visibility-menu entry.
        columnHelper.display({ id: 'position', header: '#', cell: () => null }),
        // Numbers default to descending-first; ascending matches how every other column starts.
        columnHelper.accessor('generation', { header: 'Generation', sortFn: sortFn_basic, sortDescFirst: false }),
        columnHelper.accessor((row) => row.region ?? '—', {
          id: 'region',
          header: 'Region',
          sortFn: sortFn_alphanumeric,
        }),
        // Sorts by how many selected games it's obtainable in; no data sorts below 0.
        columnHelper.accessor((row) => row.availableIn?.length ?? -1, {
          id: 'availability',
          header: 'Availability',
          sortFn: sortFn_basic,
          sortDescFirst: false,
          cell: (ctx) => <AvailabilityCell entry={ctx.row.original} />,
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
    <div className="flex w-full flex-col gap-6 md:flex-row">
      <aside className="w-full shrink-0 rounded-lg md:w-52 border border-border bg-surface p-3">
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Lists</h2>
        <ListSwitcher />
        {dataset && <TrophiesPanel trophies={trophies} />}
      </aside>
      <div className="min-w-0 flex-1">
        {result.loading && <p className="text-muted">Loading Pokémon data…</p>}
        {result.error && <p className="text-muted">Failed to load dataset: {result.error.message}</p>}
        {!result.loading && !result.error && hydrated && !activeList && (
          <>
            {!userState.preferences.welcomeDismissed && <WelcomeCard onDismiss={dismissWelcome} />}
            <section aria-label="Get started" className="rounded-2xl border border-border bg-surface p-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Start your Living Dex</h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Choose which Pokémon you want to collect. We'll explain each option and plan your boxes so nothing has
                to move when your collection grows.
              </p>
              <button type="button" onClick={() => setWizardOpen(true)} className="btn btn-primary mt-4">
                Start
              </button>
            </section>
          </>
        )}
        {wizardOpen && <StartWizard onClose={() => setWizardOpen(false)} />}
        {!result.loading && !result.error && activeList && (
          <>
            {!userState.preferences.welcomeDismissed && <WelcomeCard onDismiss={dismissWelcome} />}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">Living Dex</h1>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  Tier
                  <select
                    value={tierId}
                    onChange={(e) => changeTier(e.target.value as TierId)}
                    className="btn"
                  >
                    {(Object.keys(TIER_LABELS) as TierId[]).map((id) => (
                      <option key={id} value={id}>
                        {TIER_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setTierGuideOpen(true)}
                  aria-label="Explain the collection goals"
                  title="What are tiers?"
                  className="btn btn-sm btn-icon h-7 w-7"
                >
                  ?
                </button>
                <ColumnVisibilityMenu columns={hideableColumns} onReset={resetColumns} />
                <FilterMenu
                  toggles={[
                    { id: 'finalStageOnly', label: 'Final stage only', checked: filter.finalStageOnly, toggle: toggleFinalStageOnly },
                    { id: 'regionalFormsOnly', label: 'Regional forms only', checked: filter.regionalFormsOnly, toggle: toggleRegionalFormsOnly },
                    { id: 'hideGenderVariants', label: 'Hide gender variants', checked: filter.hideGenderVariants, toggle: toggleHideGenderVariants },
                    { id: 'hideInaccessible', label: 'Hide inaccessible', checked: filter.hideInaccessible, toggle: toggleHideInaccessible },
                  ]}
                  games={{
                    options: GAMES.map((game) => ({ ...game, selected: selectedGameIds.includes(game.id) })),
                    toggle: toggleGame,
                    selectAll: selectAllGames,
                    selectNone: selectNoGames,
                  }}
                />
              </div>
            </div>
            <OwnedProgress progress={progress} />
            {/* Column widths are percentages that always sum to 100% (see lib/columnWeights.ts), so
                the table can never be wider or narrower than its container — nothing to scroll. */}
            <div className="overflow-clip rounded-lg border border-border">
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
                            className={`sticky top-0 z-20 cursor-grab overflow-hidden bg-surface p-2.5 text-xs font-semibold tracking-wide text-muted uppercase select-none active:cursor-grabbing ${
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
                  <GamePickerContext.Provider value={toggleGamePicker}>
                    {table.getRowModel().rows.map((row, index) => (
                      <TableRow
                        key={row.id}
                        row={row}
                        position={index + 1}
                        owned={ownedIds.has(row.original.slug)}
                        ownedGames={getOwnedGames(activeList, row.original.slug)}
                        pickerOpen={picker?.slug === row.original.slug}
                        onToggle={toggleOwned}
                        columnsKey={columnsKey}
                      />
                    ))}
                  </GamePickerContext.Provider>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {pendingTier && activeList && tierSets && (
        <TierChangeDialog
          sets={tierSets}
          to={pendingTier}
          layoutTier={layoutTier}
          onCancel={() => setPendingTier(null)}
          onContinue={() => {
            updateList(activeList.id, { tier: pendingTier, layoutTier })
            setPendingTier(null)
          }}
          onMigrate={() => {
            cloneList(activeList.id, {
              name: `${activeList.name} (${TIER_LABELS[pendingTier]})`,
              tier: pendingTier,
              layoutTier: pendingTier,
            })
            setPendingTier(null)
          }}
        />
      )}
      {tierGuideOpen && (
        <Dialog label="What are tiers?" onClose={() => setTierGuideOpen(false)} className="w-[34rem]">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">What are tiers?</h3>
            <p className="text-sm text-muted">
              A tier is the goal of your collection: which Pokémon count. Smaller tiers are a quicker goal; bigger ones
              include more forms. Your list is on <strong>{TIER_LABELS[tierId]}</strong>
              {layoutTier !== tierId && (
                <>
                  , with boxes planned for <strong>{TIER_LABELS[layoutTier]}</strong>
                </>
              )}
              .
            </p>
            <TierCards sets={tierSets} value={tierId} label="Tiers" />
            <div className="flex justify-end">
              <button type="button" onClick={() => setTierGuideOpen(false)} className="btn btn-primary">
                Got it
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {picker && pickerEntry && (
        <GamePickerPopover
          anchor={picker.anchor}
          title={`Obtained from — ${pickerEntry.name}`}
          options={pickerOptions}
          emptyMessage={pickerEntry.availableIn === null ? 'No availability data' : 'Not obtainable in the selected games'}
          onToggle={(gameId) => toggleOwnedGame(pickerEntry.slug, gameId)}
          onClose={closeGamePicker}
        />
      )}
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
