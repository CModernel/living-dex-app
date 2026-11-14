import { planOptions, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useEffect, useRef, useState } from 'react'
import { TIER_LABELS, WHY_PLAN } from '../lib/tiers'

// 3.60 / 3.66: the amber banner shown while a new list's box plan is undecided (3.19b): light bulb and message on the
// left, a "Plan for bigger goal" button (opens a list of goals) and "Not now" on the right. Choosing a goal or "Not now"
// (= same as the tier) decides the plan, which unlocks Box/Slot. The popover only lists strict supersets of the tier.
function PlanBanner({
  sets,
  tier,
  previousPlan,
  onPlan,
}: {
  sets: TierSlugSets
  tier: TierId
  previousPlan?: TierId
  onPlan: (target: TierId) => void
}) {
  const [open, setOpen] = useState(false)
  const [why, setWhy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const options = planOptions(sets, tier, previousPlan)

  // Closes on Escape and on a click outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Plan your boxes"
      className="relative flex min-w-72 flex-1 flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
    >
      <span aria-hidden="true">💡</span>
      <span className="min-w-40 flex-1 text-xs md:text-sm">
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
        aria-haspopup="dialog"
        className="btn btn-sm shrink-0 border-amber-600 bg-amber-100 text-amber-900 hover:border-amber-700 hover:bg-amber-200 dark:border-amber-300 dark:bg-amber-500/25 dark:text-amber-50 dark:hover:bg-amber-500/35"
      >
        Plan for bigger goal <span aria-hidden="true">▾</span>
      </button>
      <button type="button" onClick={() => onPlan(tier)} className="btn btn-sm shrink-0">
        Not now
      </button>
      <span className="sr-only">Box and Slot stay hidden until you choose.</span>
      {why && <p className="w-full text-xs">{WHY_PLAN}</p>}
      {open && (
        <div
          role="dialog"
          aria-label="Choose a bigger goal"
          className="absolute top-full right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-xl border border-border bg-background p-2 text-sm text-foreground shadow-xl"
        >
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
      )}
    </div>
  )
}

export default PlanBanner
