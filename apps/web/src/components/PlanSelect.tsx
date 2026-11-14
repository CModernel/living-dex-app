import { planOptions, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useState } from 'react'
import { TIER_LABELS, WHY_PLAN } from '../lib/tiers'
import GuideLink from './GuideLink'

// 3.27: the box plan as a plain dropdown next to Tier ("Tier: X › Plan: Y (?)"). It only ever lists the tier itself
// and strict supersets of it. While the plan is undecided (3.19b) it is the amber banner of 3.60 and Box/Slot stay
// locked; choosing anything (even "same as tier" / "Not now") decides it.
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

  // Shared by both states: the dropdown of goals (the tier itself and strict supersets) and the "?" explanation.
  const dropdown = (
    <select
      aria-label="Plan"
      value={decided ? layoutTier : ''}
      onChange={(e) => onPlan(e.target.value as TierId)}
      className={`btn ${
        decided
          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
          : 'border-amber-600 bg-transparent font-medium dark:border-amber-300'
      }`}
    >
      {!decided && (
        <option value="" disabled>
          Plan for a bigger goal…
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
  )
  const whyButton = (
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
  )
  const whyText = why && (
    <p className="w-full text-xs text-muted">
      {WHY_PLAN} Changing the plan renumbers Box and Slot.{' '}
      <GuideLink className="underline">Learn more</GuideLink>
    </p>
  )

  if (decided) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Plan
          {dropdown}
        </label>
        {whyButton}
        {whyText}
      </div>
    )
  }
  // 3.60: the original banner for a new list: message, a "Plan for a bigger goal" dropdown and "Not now"
  // (= same as the tier). Choosing either decides the plan, which unlocks Box/Slot.
  return (
    <div
      role="region"
      aria-label="Plan your boxes"
      className="flex min-w-64 flex-1 flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
    >
      <span aria-hidden="true">💡</span>
      <span className="min-w-40 flex-1">Planning to grow beyond {TIER_LABELS[tier]}? Reserve the slots now.</span>
      {whyButton}
      {dropdown}
      <button
        type="button"
        onClick={() => onPlan(tier)}
        className="btn border-gray-400 bg-transparent text-gray-700 dark:border-gray-500 dark:text-gray-200"
      >
        Not now
      </button>
      <span className="sr-only">Box and Slot stay hidden until you choose.</span>
      {whyText}
    </div>
  )
}

export default PlanSelect
