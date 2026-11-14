export type DonutSlice = { key: string; label: string; value: number; color: string }

// 3.64: a small dependency-free donut (SVG stroke segments) with its legend. `total` is the sum of the slices; the
// centre shows it. Pure presentation.
function DonutChart({ slices, centerLabel, ariaLabel }: { slices: DonutSlice[]; centerLabel: string; ariaLabel: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg role="img" aria-label={ariaLabel} viewBox="0 0 100 100" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="14" className="stroke-border" />
        {total > 0 &&
          slices.map((slice) => {
            const length = (slice.value / total) * circumference
            const segment = (
              <circle
                key={slice.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="14"
                stroke={slice.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            )
            offset += length
            return segment
          })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" transform="rotate(90 50 50)" className="fill-foreground text-[14px] font-semibold">
          {total}
        </text>
      </svg>
      <ul className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="text-muted tabular-nums">
              {slice.value} · {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
        {total === 0 && <li className="text-muted">{centerLabel}</li>}
      </ul>
    </div>
  )
}

export default DonutChart
