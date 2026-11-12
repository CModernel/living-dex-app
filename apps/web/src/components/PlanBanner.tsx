import { planOptions, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useEffect, useRef, useState } from 'react'
import { TIER_LABELS, WHY_PLAN } from '../lib/tiers'

// 3.19b: shown next to the Tier select while the list's box plan is undecided ("banner"), or as a quiet chip once
// a plan exists and bigger goals remain ("chip"). The popover only ever lists strict supersets of the tier.
function PlanBanner({
  mode,
  sets,
  tier,
  layoutTier,
  previousPlan,
  onPlan,
  onNotNow,
}: {
  mode: 'banner' | 'chip'
  sets: TierSlugSets
  tier: TierId
  layoutTier: TierId
  previousPlan?: TierId
  onPlan: (target: TierId) => void
  onNotNow: () => void
}) {
  // Open "for" a tier: when the tier changes underneath it, the popover is closed without an effect.
  const [openFor, setOpenFor] = useState<TierId | null>(null)
  const open = openFor === tier
  const setOpen = (value: boolean | ((v: boolean) => boolean)) =>
    setOpenFor((prev) => ((typeof value === 'function' ? value(prev === tier) : value) ? tier : null))
  const [why, setWhy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const options = planOptions(sets, tier, previousPlan)

  // Closes on Escape and on a click outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenFor(null)
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenFor(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const popover = open && (
    <div
      role="dialog"
      aria-label="Choose a bigger goal"
      className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-background p-2 text-sm text-foreground shadow-xl"
    >
      {mode === 'chip' && <p className="px-2 pb-1 text-xs text-muted">Changing the plan renumbers Box and Slot.</p>}
      <ul className="flex flex-col gap-1">
        {options.map((option) => (
          <li key={option.tier}>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onPlan(option.tier)
              }}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left hover:bg-brand/5 ${
                option.tier === 'living-form-full' ? 'border-brand' : 'border-border'
              }`}
            >
              <span className="font-medium">{option.keep ? `Keep ${TIER_LABELS[option.tier]}` : TIER_LABELS[option.tier]}</span>
              <span className="text-xs text-muted">
                +{option.extraSlots} slots{option.tier === 'living-form-full' ? ' · Recommended' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  if (mode === 'chip') {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="cursor-pointer rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 hover:brightness-95 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200"
        >
          📦 {layoutTier === tier ? 'Boxes: same as tier' : `Boxes planned for ${TIER_LABELS[layoutTier]}`} · change
        </button>
        {popover}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Plan your boxes"
      className="relative flex min-w-64 flex-1 flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
    >
      <span aria-hidden="true">💡</span>
      <span className="min-w-40 flex-1">
        Planning to grow beyond {TIER_LABELS[tier]}? Reserve the slots now.
        <button
          type="button"
          onClick={() => setWhy((v) => !v)}
          aria-expanded={why}
          aria-label="Why plan your boxes?"
          title={WHY_PLAN}
          className="ml-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-amber-500/60 text-xs"
        >
          i
        </button>
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="cursor-pointer rounded-lg border border-amber-600 px-2.5 py-1 text-xs font-medium hover:bg-amber-500/10 dark:border-amber-300"
      >
        Plan for bigger goal
      </button>
      <button
        type="button"
        onClick={onNotNow}
        className="cursor-pointer rounded-lg border border-gray-400 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-500/10 dark:border-gray-500 dark:text-gray-300"
      >
        Not now
      </button>
      {why && <p className="w-full text-xs">{WHY_PLAN}</p>}
      {popover}
    </div>
  )
}

export default PlanBanner
