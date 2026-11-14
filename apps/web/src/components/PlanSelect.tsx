import { planOptions, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useState } from 'react'
import { TIER_LABELS, WHY_PLAN } from '../lib/tiers'
import GuideLink from './GuideLink'

// 3.27: the DECIDED box plan as a plain dropdown next to Tier ("Tier: X › Plan: Y (?)"), tinted soft green (3.49). It
// only ever lists the tier itself and strict supersets of it. While the plan is still undecided, PlanBanner (3.66)
// is shown instead.
function PlanSelect({
  sets,
  tier,
  layoutTier,
  previousPlan,
  onPlan,
}: {
  sets: TierSlugSets
  tier: TierId
  layoutTier: TierId
  previousPlan?: TierId
  onPlan: (target: TierId) => void
}) {
  const [why, setWhy] = useState(false)
  const options = planOptions(sets, tier, previousPlan)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm">
        Plan
        <select
          aria-label="Plan"
          value={layoutTier}
          onChange={(e) => onPlan(e.target.value as TierId)}
          className="btn select border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          <option value={tier}>{TIER_LABELS[tier]} (same as tier)</option>
          {options.map((option) => (
            <option key={option.tier} value={option.tier}>
              {option.keep ? 'Keep ' : ''}
              {TIER_LABELS[option.tier]} (+{option.extraSlots} slots)
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
          {WHY_PLAN} Changing the plan renumbers Box and Slot. <GuideLink className="underline">Learn more</GuideLink>
        </p>
      )}
    </div>
  )
}

export default PlanSelect
