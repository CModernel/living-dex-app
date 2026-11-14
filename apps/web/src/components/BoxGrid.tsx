import { BOX_SIZE, type PokemonDataset, type PokemonEntry } from '@living-dex/business-logic'
import { memo, useMemo } from 'react'
import { useSpriteSource } from '../hooks/useSpriteSource'

// 3.18 grid view: HOME-style boxes, 6 columns × 5 rows, numbered by the list's box plan so each card matches a real
// box 1:1. Every box keeps its 30 positions: reserved slots for a bigger planned tier are dashed with a darkened
// black-and-white sprite (3.54; the grid has no "Show future slots" option, 3.55), slots hidden by filters are dimmed, both inert. Tap = owned (game tags: table view).

type SlotState = 'active' | 'filtered' | 'future'

const Tile = memo(function Tile({
  dataset,
  entry,
  state,
  owned,
  dim,
  onToggle,
}: {
  dataset: PokemonDataset
  entry: PokemonEntry
  state: SlotState
  owned: boolean
  dim: boolean
  onToggle: (slug: string) => void
}) {
  const { src, onError } = useSpriteSource(dataset, entry)
  const sprite = <img src={src} onError={onError} alt="" loading="lazy" className="min-h-0 w-full flex-1 object-contain" />

  if (state === 'future') {
    return (
      <div
        role="img"
        aria-label={`${entry.name} (reserved for your planned goal)`}
        title={`${entry.name}: part of your planned goal`}
        className="flex aspect-square rounded-lg border border-dashed border-border p-0.5 opacity-80 [&_img]:brightness-[.4] [&_img]:grayscale"
      >
        {sprite}
      </div>
    )
  }
  if (state === 'filtered') {
    return (
      <div
        role="img"
        aria-label={`${entry.name} (hidden by filters)`}
        title={`${entry.name}: hidden by your filters`}
        className="aspect-square rounded-lg border border-border/60 p-0.5 opacity-25 [&_img]:grayscale"
      >
        {sprite}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onToggle(entry.slug)}
      aria-label={`Mark ${entry.name} as owned`}
      aria-pressed={owned}
      title={`${entry.name} · #${entry.dex}${owned ? ' · owned' : ''} (game tags: table view)`}
      className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border p-0.5 pb-2.5 transition active:translate-y-px ${
        dim ? 'opacity-25' : ''
      } ${
        owned ? 'border-brand bg-brand/15' : 'border-border bg-background hover:border-foreground/30'
      }`}
    >
      {sprite}
      <span className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] leading-none text-muted">{entry.dex}</span>
      {owned && (
        <span aria-hidden="true" className="absolute top-0.5 right-0.5 text-[10px] leading-none text-brand">
          ✓
        </span>
      )}
    </button>
  )
})

function BoxGrid({
  dataset,
  boxes,
  inTier,
  visible,
  ownedIds,
  matches,
  onToggle,
}: {
  dataset: PokemonDataset
  boxes: string[][]
  inTier: ReadonlySet<string>
  visible: ReadonlySet<string>
  ownedIds: ReadonlySet<string>
  // 3.32 search: when set, tappable tiles that do not match are dimmed (the box keeps its real layout).
  matches: ReadonlySet<string> | null
  onToggle: (slug: string) => void
}) {
  // Dataset keys are not guaranteed to be slugs, so look entries up by slug.
  const bySlug = useMemo(() => new Map(Object.values(dataset.pokemon).map((e) => [e.slug, e])), [dataset])
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
      {boxes.map((slugs, b) => {
        const tierSlugs = slugs.filter((slug) => inTier.has(slug))
        const owned = tierSlugs.filter((slug) => ownedIds.has(slug)).length
        return (
          <section key={b} aria-label={`Box ${b + 1}`} className="rounded-xl border border-border bg-surface p-2">
            <h3 className="mb-1.5 flex items-baseline justify-between px-1 text-sm font-semibold">
              Box {b + 1}
              <span className="text-xs font-normal text-muted">
                {owned}/{tierSlugs.length}
              </span>
            </h3>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: BOX_SIZE }, (_, i) => {
                const slug = slugs[i]
                const entry = slug ? bySlug.get(slug) : undefined
                if (!entry) return <div key={i} aria-hidden="true" className="aspect-square rounded-lg" />
                const state: SlotState = !inTier.has(slug) ? 'future' : visible.has(slug) ? 'active' : 'filtered'
                return (
                  <Tile
                    key={slug}
                    dataset={dataset}
                    entry={entry}
                    state={state}
                    owned={ownedIds.has(slug)}
                    dim={!!matches && !matches.has(slug)}
                    onToggle={onToggle}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default BoxGrid
