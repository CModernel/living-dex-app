import { BOX_SIZE, type PokemonDataset, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useState } from 'react'
import { useDataset } from '../hooks/useDataset'
import { TIER_BADGE, TIER_ICON, TIER_INFO, TIER_LABELS, TROPHY_TIER_ORDER, useTierSets } from '../lib/tiers'

// "What's the difference?" (3.19b). A drawn Euler/Venn diagram of which tier contains which, beside the size bars,
// and ONE detail panel for the selected tier with real example names: the only place that shows the concrete
// Pokémon behind the rules (which forms or gender differences a bigger tier adds). Names only, no official art.

function examples(dataset: PokemonDataset, sets: TierSlugSets, from: TierId, minus: TierId, max = 4): string[] {
  return Object.values(dataset.pokemon)
    .filter((e) => sets[from].has(e.slug) && !sets[minus].has(e.slug))
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .slice(0, max)
    .map((e) => e.name)
}

// Hand-placed circles. Living Lite and Final Form Full overlap inside Living Form; Final Form sits in their overlap
// but pokes out of Living Lite (the real data has a Final Form entry, Floette Eternal Flower, that Lite skips).
const CIRCLES: Record<TierId, { cx: number; cy: number; r: number; color: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } }> = {
  'living-form-full': { cx: 180, cy: 132, r: 126, color: 'emerald', label: { x: 180, y: 26, anchor: 'middle' } },
  'living-form': { cx: 180, cy: 145, r: 104, color: 'violet', label: { x: 180, y: 62, anchor: 'middle' } },
  'living-lite': { cx: 146, cy: 160, r: 64, color: 'orange', label: { x: 118, y: 146, anchor: 'middle' } },
  'final-form-full': { cx: 222, cy: 160, r: 54, color: 'pink', label: { x: 236, y: 128, anchor: 'middle' } },
  'final-form': { cx: 210, cy: 172, r: 20, color: 'sky', label: { x: 210, y: 236, anchor: 'middle' } },
}
// Full class names (Tailwind only ships classes it can see written out).
const STROKE: Record<string, string> = {
  emerald: 'stroke-emerald-500 fill-emerald-500/5',
  violet: 'stroke-violet-500 fill-violet-500/5',
  orange: 'stroke-orange-500 fill-orange-500/10',
  pink: 'stroke-pink-500 fill-pink-500/10',
  sky: 'stroke-sky-500 fill-sky-500/20',
}
const DRAW_ORDER: TierId[] = ['living-form-full', 'living-form', 'living-lite', 'final-form-full', 'final-form']

function Venn({ sets, selected, onSelect }: { sets: TierSlugSets | null; selected: TierId; onSelect: (t: TierId) => void }) {
  return (
    <svg viewBox="0 0 360 264" role="group" aria-label="Which tier contains which" className="w-full max-w-sm">
      {DRAW_ORDER.map((id) => {
        const c = CIRCLES[id]
        const active = id === selected
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-label={`${TIER_LABELS[id]} circle`}
            aria-pressed={active}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
            className="cursor-pointer outline-none"
          >
            <circle cx={c.cx} cy={c.cy} r={c.r} strokeWidth={active ? 3 : 1.5} className={STROKE[c.color]} />
            <text x={c.label.x} y={c.label.y} textAnchor={c.label.anchor} className="fill-foreground text-[11px] font-semibold">
              {TIER_LABELS[id]}
            </text>
            <text x={c.label.x} y={c.label.y + 13} textAnchor={c.label.anchor} className="fill-muted text-[10px]">
              {sets ? sets[id].size : '…'}
            </text>
          </g>
        )
      })}
      {/* Leader line from the Final Form label up to its circle. */}
      <line x1={210} y1={224} x2={210} y2={193} className="stroke-sky-500" strokeWidth={1} strokeDasharray="2 2" />
    </svg>
  )
}

function TiersPage() {
  const result = useDataset()
  const dataset = result.loading || result.error ? null : result.dataset
  const sets = useTierSets(dataset)
  const [selected, setSelected] = useState<TierId>('final-form')
  const largest = sets ? sets['living-form-full'].size : 1
  const outsideLite = dataset && sets ? examples(dataset, sets, 'final-form', 'living-lite', 3) : []

  const index = TROPHY_TIER_ORDER.indexOf(selected)
  const prev = index > 0 ? TROPHY_TIER_ORDER[index - 1] : null
  const adds = prev && dataset && sets ? examples(dataset, sets, selected, prev) : []
  const drops = prev && dataset && sets ? examples(dataset, sets, prev, selected) : []
  const badge = TIER_BADGE[selected]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">What's the difference between tiers?</h1>
        <p className="mt-1 text-sm text-muted">
          A tier is the goal of your collection: which Pokémon count. Bigger tiers include more forms; smaller ones are
          a quicker goal. Box and Slot follow the order of the tier your boxes are planned for. Tap a tier to see what it
          adds.
        </p>
      </header>

      <section aria-label="Overview" className="grid gap-6 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <h2 className="self-start text-sm font-semibold">Which tier contains which</h2>
          <Venn sets={sets} selected={selected} onSelect={setSelected} />
          <p className="text-xs text-muted">
            Final Form pokes out of Living Lite
            {outsideLite.length > 0 && <> ({outsideLite.join(', ')})</>}: a Final Form list can grow into Final Form
            Full, Living Form or Living Form Full without moving anything, but not into Living Lite.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">How big is each goal</h2>
          <ul className="flex flex-col gap-1">
            {TROPHY_TIER_ORDER.map((id) => {
              const size = sets?.[id].size ?? 0
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelected(id)}
                    aria-pressed={id === selected}
                    className={`grid w-full cursor-pointer grid-cols-[7.5rem_1fr_6.5rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-border/20 ${
                      id === selected ? 'bg-brand/10' : ''
                    }`}
                  >
                    <span>{TIER_LABELS[id]}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-border/40">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(size / largest) * 100}%` }} />
                    </span>
                    <span className="text-right text-xs text-muted">
                      {sets ? `${size} · ${Math.ceil(size / BOX_SIZE)} boxes` : '…'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section aria-label="Selected tier" aria-live="polite" className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold">
          <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-lg ${TIER_ICON[selected].tint}`}>
            {TIER_ICON[selected].glyph}
          </span>
          {TIER_LABELS[selected]}
          {badge && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>}
        </h2>
        <p className="mt-1 text-sm">{TIER_INFO[selected].summary}</p>
        <p className="text-xs text-muted">
          Includes: {TIER_INFO[selected].includes} Skips: {TIER_INFO[selected].skips}
        </p>
        {adds.length > 0 && prev && (
          <p className="mt-2 text-sm">
            <span className="font-medium">Adds over {TIER_LABELS[prev]}:</span> {adds.join(', ')}…
          </p>
        )}
        {drops.length > 0 && prev && (
          <p className="text-sm">
            <span className="font-medium">Leaves out from {TIER_LABELS[prev]}:</span> {drops.join(', ')}…
          </p>
        )}
      </section>
    </div>
  )
}

export default TiersPage
