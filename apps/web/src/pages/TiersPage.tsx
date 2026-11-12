import { BOX_SIZE, type PokemonDataset, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import type { ReactNode } from 'react'
import { useDataset } from '../hooks/useDataset'
import { TIER_BADGE, TIER_ICON, TIER_INFO, TIER_LABELS, TROPHY_TIER_ORDER, useTierSets } from '../lib/tiers'

// "What's the difference?" (3.19b): which tier contains which, how big each is, and real example names of what a
// tier adds or leaves out compared with the previous one. Names only, no official art (IP guide).

function examples(dataset: PokemonDataset, sets: TierSlugSets, from: TierId, minus: TierId, max = 4): string[] {
  return Object.values(dataset.pokemon)
    .filter((e) => sets[from].has(e.slug) && !sets[minus].has(e.slug))
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .slice(0, max)
    .map((e) => e.name)
}

function SetBox({ id, sets, children }: { id: TierId; sets: TierSlugSets | null; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-background/60 p-2.5">
      <span className="text-xs font-semibold">
        {TIER_ICON[id].glyph} {TIER_LABELS[id]} <span className="font-normal text-muted">{sets?.[id].size ?? '…'}</span>
      </span>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

function TiersPage() {
  const result = useDataset()
  const dataset = result.loading || result.error ? null : result.dataset
  const sets = useTierSets(dataset)
  const largest = sets ? sets['living-form-full'].size : 1
  const outsideLite = dataset && sets ? examples(dataset, sets, 'final-form', 'living-lite', 3) : []

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">What's the difference between tiers?</h1>
        <p className="mt-1 text-sm text-muted">
          A tier is the goal of your collection: which Pokémon count. Bigger tiers include more forms; smaller ones are
          a quicker goal. Box and Slot follow the order of the tier your boxes are planned for.
        </p>
      </header>

      <section aria-label="Which tier contains which" className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Which tier contains which</h2>
        <SetBox id="living-form-full" sets={sets}>
          <SetBox id="living-form" sets={sets}>
            <SetBox id="living-lite" sets={sets} />
            <SetBox id="final-form-full" sets={sets}>
              <SetBox id="final-form" sets={sets} />
            </SetBox>
          </SetBox>
        </SetBox>
        <p className="mt-3 text-xs text-muted">
          Final Form is not completely inside Living Lite
          {outsideLite.length > 0 && <> (for example {outsideLite.join(', ')})</>}, so a Final Form list can grow into
          Final Form Full, Living Form or Living Form Full, but not Living Lite, without moving anything.
        </p>
      </section>

      <section aria-label="Tier sizes" className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">How big is each goal</h2>
        <ul className="flex flex-col gap-2">
          {TROPHY_TIER_ORDER.map((id) => {
            const size = sets?.[id].size ?? 0
            return (
              <li key={id} className="grid grid-cols-[8.5rem_1fr_5.5rem] items-center gap-2 text-sm">
                <span>{TIER_LABELS[id]}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-border/40">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${(size / largest) * 100}%` }} />
                </span>
                <span className="text-right text-xs text-muted">
                  {sets ? `${size} · ${Math.ceil(size / BOX_SIZE)} boxes` : '…'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Tier details" className="flex flex-col gap-3">
        {TROPHY_TIER_ORDER.map((id, i) => {
          const prev = i > 0 ? TROPHY_TIER_ORDER[i - 1] : null
          const adds = prev && dataset && sets ? examples(dataset, sets, id, prev) : []
          const drops = prev && dataset && sets ? examples(dataset, sets, prev, id) : []
          const badge = TIER_BADGE[id]
          return (
            <article key={id} aria-label={TIER_LABELS[id]} className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                <span aria-hidden="true" className={`flex h-8 w-8 items-center justify-center rounded-lg ${TIER_ICON[id].tint}`}>
                  {TIER_ICON[id].glyph}
                </span>
                {TIER_LABELS[id]}
                {badge && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>}
              </h3>
              <p className="mt-1 text-sm">{TIER_INFO[id].summary}</p>
              <p className="text-xs text-muted">
                Includes: {TIER_INFO[id].includes} Skips: {TIER_INFO[id].skips}
              </p>
              {prev && adds.length > 0 && (
                <p className="mt-2 text-xs">
                  <span className="font-medium">Adds over {TIER_LABELS[prev]}:</span> {adds.join(', ')}…
                </p>
              )}
              {prev && drops.length > 0 && (
                <p className="text-xs">
                  <span className="font-medium">Leaves out from {TIER_LABELS[prev]}:</span> {drops.join(', ')}…
                </p>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default TiersPage
