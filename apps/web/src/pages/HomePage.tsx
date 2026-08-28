import {
  getPokeJungleSpriteUrl,
  getSpriteUrl,
  type PokemonEntry,
  type PokemonDataset,
} from '@living-dex/business-logic'
import { TIERS, type TierId } from '@cmodernel/living-dex-tiers'
import { flexRender, useTable } from '@tanstack/react-table'
import { columnVisibilityFeature, createColumnHelper, tableFeatures, type ColumnDef, type Row } from '@tanstack/table-core'
import { memo, useMemo, useState } from 'react'
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu'
import ListSwitcher from '../components/ListSwitcher'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
import { useColumnVisibility } from '../hooks/useColumnVisibility'
import { useDataset } from '../hooks/useDataset'

const TIER_LABELS: Record<TierId, string> = {
  'living-form': 'Living Form',
  'living-lite': 'Living Lite',
  'final-form-full': 'Final Form Full',
  'final-form': 'Final Form',
}

// Module-level: no runtime data dependency, must stay stable across renders.
const features = tableFeatures({ columnVisibilityFeature })
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

  const usePokeJungle = pokeJungleUrl !== null && failedUrl !== pokeJungleUrl
  const spriteUrl = (usePokeJungle ? pokeJungleUrl : pokeApiUrl) ?? undefined
  // Re-setting the same value is a no-op in React, so a fallback that also 404s just
  // stops here instead of looping.
  const handleError = usePokeJungle ? () => setFailedUrl(pokeJungleUrl) : undefined
  const hoverSize = SPRITE_SIZE * SPRITE_HOVER_ZOOM

  return (
    <div className="group relative inline-block">
      <img
        src={spriteUrl}
        alt=""
        loading="lazy"
        onError={handleError}
        style={{ width: SPRITE_SIZE, height: SPRITE_SIZE, maxWidth: 'none' }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-background p-2 shadow-lg group-hover:block">
        <img
          src={spriteUrl}
          alt=""
          onError={handleError}
          style={{ width: hoverSize, height: hoverSize, maxWidth: 'none' }}
        />
      </div>
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
  // Not read directly — including it in props (a new object each time visibility changes) is
  // what makes memo correctly re-render when column visibility toggles. `row`'s own reference
  // doesn't change on a visibility toggle (only data/columns changes affect the row model), so
  // without this, memo would wrongly skip re-rendering rows after a column show/hide.
  columnVisibility: Record<string, boolean>
}) {
  return (
    <tr
      onClick={() => onToggle(row.original.slug)}
      className={`cursor-pointer border-b border-border last:border-b-0 hover:bg-border/20 ${owned ? 'bg-brand/15' : ''}`}
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
  const [tierId, setTierId] = useState<TierId>('living-form')

  const dataset = result.loading || result.error ? null : result.dataset
  const entries = useMemo(() => {
    if (!dataset) return []
    return Object.values(dataset.pokemon)
      .filter(TIERS[tierId].predicate)
      .sort((a, b) => a.sortIndex - b.sortIndex)
  }, [dataset, tierId])
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
          header: '',
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
      state: { columnVisibility },
      onColumnVisibilityChange: setColumnVisibility,
    },
    (state) => ({ columnVisibility: state.columnVisibility }),
  )

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
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border bg-surface text-left">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={`p-2.5 text-xs font-semibold tracking-wide text-muted uppercase ${COLUMN_CELL_CLASS[header.column.id] ?? ''}`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default HomePage
