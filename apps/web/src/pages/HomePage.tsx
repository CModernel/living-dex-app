import { getSpriteUrl, type PokemonEntry, type PokemonDataset } from '@living-dex/business-logic'
import { TIERS, type TierId } from '@cmodernel/living-dex-tiers'
import { flexRender, useTable } from '@tanstack/react-table'
import { columnVisibilityFeature, createColumnHelper, tableFeatures, type ColumnDef, type Row } from '@tanstack/table-core'
import { memo, useMemo, useState } from 'react'
import ColumnVisibilityMenu from '../components/ColumnVisibilityMenu'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
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

function Sprite({ dataset, entry }: { dataset: PokemonDataset; entry: PokemonEntry }) {
  const spriteUrl = getSpriteUrl(dataset, entry) ?? undefined
  return (
    <div className="group relative inline-block">
      <img src={spriteUrl} alt="" loading="lazy" style={{ width: 48, height: 48, maxWidth: 'none' }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-background p-2 shadow-lg group-hover:block">
        <img src={spriteUrl} alt="" style={{ width: 96, height: 96, maxWidth: 'none' }} />
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
      className={`cursor-pointer border-b border-border ${owned ? 'bg-brand/15' : ''}`}
    >
      {row.getVisibleCells().map((cell) =>
        cell.column.id === 'owned' ? (
          <td key={cell.id} className="p-2 text-center">
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
          <td key={cell.id} className="p-2">
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

  const table = useTable(
    {
      features,
      columns,
      data: entries,
      initialState: {
        columnVisibility: { dex: false, generation: false, region: false, evolutionStage: false },
      },
    },
    (state) => ({ columnVisibility: state.columnVisibility }),
  )

  if (result.loading) {
    return <p className="text-muted">Loading Pokémon data…</p>
  }

  if (result.error) {
    return <p className="text-muted">Failed to load dataset: {result.error.message}</p>
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

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Living Dex</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Tier
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value as TierId)}
              className="cursor-pointer rounded border border-border bg-background px-2 py-1"
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
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border text-left">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="p-2">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
  )
}

export default HomePage
