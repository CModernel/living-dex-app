import type { StatRow } from '@living-dex/business-logic'

// 3.64: horizontal owned/total bars (types, generations, forms). `colorOf` tints each bar (e.g. by Pokémon type).
function StatBars({ rows, colorOf, ariaLabel }: { rows: StatRow[]; colorOf?: (row: StatRow) => string | undefined; ariaLabel: string }) {
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-1.5">
      {rows.map((row) => {
        const percent = row.total > 0 ? Math.round((row.owned / row.total) * 100) : 0
        return (
          <li key={row.key} className="grid grid-cols-[7.5rem_1fr_5.5rem] items-center gap-2 text-xs">
            <span className="truncate capitalize">{row.label}</span>
            <span role="progressbar" aria-label={`${row.label} owned`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded-full bg-border">
              <span className="block h-full bg-brand" style={{ width: `${percent}%`, backgroundColor: colorOf?.(row) }} />
            </span>
            <span className="text-right text-muted tabular-nums">
              {row.owned} / {row.total}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default StatBars
