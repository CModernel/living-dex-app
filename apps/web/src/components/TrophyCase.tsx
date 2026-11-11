import type { Trophy } from '@living-dex/business-logic'
import Medal from './Medal'

// Full "trophy case" dialog: every medal grouped by tier (milestones), then generations and
// regional forms; locked medals stay visible, greyed, with progress.
function Group({ title, trophies, caption }: { title: string; trophies: Trophy[]; caption: (t: Trophy) => string }) {
  if (trophies.length === 0) return null
  return (
    <section aria-label={title} className="mb-4">
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h3>
      <ul className="flex flex-wrap gap-3">
        {trophies.map((t) => (
          <li key={t.id} data-earned={t.earned} className="flex w-14 flex-col items-center gap-0.5 text-center">
            <Medal trophy={t} size={44} />
            <span className={`text-[11px] ${t.earned ? 'font-medium' : 'text-muted'}`}>{caption(t)}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Trophy case"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-[28rem] max-w-[92vw] overflow-y-auto rounded-lg border border-border bg-background p-4 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Trophy case {earned}/{trophies.length}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-sm hover:bg-border/30"
          >
            Close
          </button>
        </div>
        {tierNames.map((name) => (
          <Group
            key={name}
            title={name}
            trophies={trophies.filter((t) => t.kind === 'milestone' && t.tierName === name)}
            caption={(t) => `${t.milestone}%`}
          />
        ))}
        <Group
          title="Generations"
          trophies={trophies.filter((t) => t.kind === 'generation')}
          caption={(t) => `Gen ${t.generation}`}
        />
        <Group title="Regional forms" trophies={trophies.filter((t) => t.kind === 'regional')} caption={() => 'Regional'} />
      </div>
    </div>
  )
}

export default TrophyCase
