import type { Trophy } from '@living-dex/business-logic'
import Dialog from './Dialog'
import Medal from './Medal'

// Rank colors for the progress bar, matching Medal's metals (index = tier rank).
const BAR_COLORS = ['#888890', '#B87333', '#9AA3AD', '#D4A017', '#2FA7A0', '#6C3FC4']

// Full "trophy case" dialog: one row per tier (name, its four milestone medals, progress), then a
// Generations row and a Regional row. Locked medals stay visible, greyed, with progress in the label.
function TierRow({ name, trophies }: { name: string; trophies: Trophy[] }) {
  const { owned, total } = trophies[0].progress
  const percent = total > 0 ? Math.floor((owned * 100) / total) : 0
  return (
    <section aria-label={name} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
      <h3 className="w-28 shrink-0 text-sm font-medium">{name}</h3>
      <ul className="flex shrink-0 gap-1">
        {trophies.map((t) => (
          <li key={t.id} data-earned={t.earned}>
            <Medal trophy={t} size={32} />
          </li>
        ))}
      </ul>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${percent}%`, backgroundColor: BAR_COLORS[Math.min(trophies[0].rank, 5)] }}
          />
        </div>
        <span className="w-9 shrink-0 text-right text-xs text-muted">{percent}%</span>
      </div>
    </section>
  )
}

function WrapRow({ title, trophies, caption }: { title: string; trophies: Trophy[]; caption: (t: Trophy) => string }) {
  if (trophies.length === 0) return null
  return (
    <section aria-label={title} className="border-b border-border py-2.5 last:border-b-0">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ul className="flex flex-wrap gap-x-2 gap-y-2">
        {trophies.map((t) => (
          <li key={t.id} data-earned={t.earned} className="flex w-12 flex-col items-center gap-0.5">
            <Medal trophy={t} size={36} />
            <span className={`text-[10px] ${t.earned ? 'font-medium' : 'text-muted'}`}>{caption(t)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TrophyCase({ trophies, onClose }: { trophies: Trophy[]; onClose: () => void }) {
  const tierNames: string[] = []
  for (const t of trophies) if (t.kind === 'milestone' && t.tierName && !tierNames.includes(t.tierName)) tierNames.push(t.tierName)
  const earned = trophies.filter((t) => t.earned).length
  return (
    <Dialog label="Trophy case" onClose={onClose} className="w-[34rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Trophy case {earned}/{trophies.length}
          </h2>
          <p className="text-xs text-muted">Medal color shows the tier: bronze lowest, purple highest.</p>
        </div>
        <button type="button" onClick={onClose} className="btn btn-sm">
          Close
        </button>
      </div>
      {tierNames.map((name) => (
        <TierRow key={name} name={name} trophies={trophies.filter((t) => t.kind === 'milestone' && t.tierName === name)} />
      ))}
      <WrapRow title="Generations" trophies={trophies.filter((t) => t.kind === 'generation')} caption={(t) => `Gen ${t.generation}`} />
      <WrapRow title="Regional forms" trophies={trophies.filter((t) => t.kind === 'regional')} caption={() => 'Regional'} />
    </Dialog>
  )
}

export default TrophyCase
