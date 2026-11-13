import { planOptions, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useState } from 'react'
import { TIER_LABELS, WHY_PLAN } from '../lib/tiers'
import GuideLink from './GuideLink'

// 3.27: the box plan as a plain dropdown next to Tier ("Tier: X › Plan: Y (?)"). It only ever lists the tier itself
// and strict supersets of it. While the plan is undecided (3.19b) it shows "Choose your plan…", Box/Slot stay
// locked, and the control is tinted so it is noticed; choosing anything (even "same as tier") decides it.
function PlanSelect({
  sets,
  tier,
  layoutTier,
  decided,
  previousPlan,
  onPlan,
}: {
  sets: TierSlugSets
  tier: TierId
  layoutTier: TierId
  decided: boolean
  previousPlan?: TierId
  onPlan: (target: TierId) => void
}) {
  const [why, setWhy] = useState(false)
  const options = planOptions(sets, tier, previousPlan)

  const control = (
    <>
      <label className="flex items-center gap-2 text-sm">
        Plan
        <select
          aria-label="Plan"
          value={decided ? layoutTier : ''}
          onChange={(e) => onPlan(e.target.value as TierId)}
          className={`btn ${
            decided
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-amber-500 dark:border-amber-400'
          }`}
        >
          {!decided && (
            <option value="" disabled>
              Choose your plan…
            </option>
          )}
          <option value={tier}>{TIER_LABELS[tier]} (same as tier)</option>
          {options.map((option) => (
            <option key={option.tier} value={option.tier}>
              {option.keep ? 'Keep ' : ''}
              {TIER_LABELS[option.tier]} (+{option.extraSlots} slots{option.tier === 'living-form-full' && !decided ? ' · Recommended' : ''})
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => setWhy((v) => !v)}
        aria-expanded={why}
        aria-label="Why plan your boxes?"
        title={WHY_PLAN}
        className="btn btn-sm btn-icon h-7 w-7"
      >
        ?
      </button>
      {why && (
        <p className="w-full text-xs text-muted">
          {WHY_PLAN} Changing the plan renumbers Box and Slot.{' '}
          <GuideLink className="underline">Learn more</GuideLink>
        </p>
      )}
    </>
  )

  if (decided) return <div className="flex flex-wrap items-center gap-2">{control}</div>
  return (
    <div
      role="region"
      aria-label="Plan your boxes"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
    >
      {control}
      <span className="sr-only">Box and Slot stay hidden until you choose.</span>
    </div>
  )
}

export default PlanSelect
