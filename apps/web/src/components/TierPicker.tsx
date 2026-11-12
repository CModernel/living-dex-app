import { BOX_SIZE, type TierId } from '@living-dex/business-logic'
import { useState } from 'react'
import { useDataset } from '../hooks/useDataset'
import { useLists } from '../hooks/useLists'
import { TIER_BADGE, TIER_ICON, TIER_INFO, TIER_LABELS, TROPHY_TIER_ORDER, useTierSets } from '../lib/tiers'
import GuideLink from './GuideLink'

// 3.19b: choosing what to collect IS creating the list. Vertical tiles, smallest goal first; the box plan is
// decided afterwards from the list header (PlanBanner). Used full-screen on Home when there is no list, and in a
// dialog from the "+" button.
function TierPicker({ onCreated }: { onCreated?: () => void }) {
  const { dataset } = useDataset()
  const sets = useTierSets(dataset)
  const { lists, createNewList } = useLists()
  const [creating, setCreating] = useState(false)

  function pick(tier: TierId) {
    if (creating) return // a double tap must never create two lists
    setCreating(true)
    createNewList(lists.length === 0 ? 'My Living Dex' : TIER_LABELS[tier], { tier })
    onCreated?.()
  }

  return (
    <section aria-label="Choose what to collect" className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">What do you want to collect?</h1>
        <p className="mt-1 text-sm text-muted">
          Pick a goal, you can grow it later.{' '}
          <GuideLink className="font-medium text-brand underline underline-offset-2">What's the difference?</GuideLink>
        </p>
      </div>
      {TROPHY_TIER_ORDER.map((id) => {
        const size = sets?.[id].size
        const boxes = size === undefined ? null : Math.ceil(size / BOX_SIZE)
        const badge = TIER_BADGE[id]
        return (
          <button
            key={id}
            type="button"
            disabled={!sets || creating}
            onClick={() => pick(id)}
            aria-label={TIER_LABELS[id]}
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:border-brand hover:bg-brand/5 active:translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${TIER_ICON[id].tint}`}>
              {TIER_ICON[id].glyph}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{TIER_LABELS[id]}</span>
                {badge && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>}
              </span>
              <span className="block text-sm text-muted">{TIER_INFO[id].summary}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-muted">
              <span className="block text-lg font-semibold text-foreground">{size ?? '…'}</span>
              <span className="block">Pokémon to collect</span>
              {boxes !== null && <span className="block">{`${boxes} ${boxes === 1 ? 'box' : 'boxes'}`}</span>}
            </span>
          </button>
        )
      })}
    </section>
  )
}

export default TierPicker
