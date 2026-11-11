import { BOX_SIZE, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { TIER_INFO, TIER_LABELS, TROPHY_TIER_ORDER } from '../lib/tiers'

const boxes = (size: number) => {
  const n = Math.ceil(size / BOX_SIZE)
  return `${n} ${n === 1 ? 'box' : 'boxes'}`
}

// Plain-language tier guide (3.19): one card per tier, smallest first, with what it includes/skips and how
// many Pokémon and boxes it takes. With `onChange` the cards are a radio group; without it, read-only.
function TierCards({
  sets,
  value,
  onChange,
  options = TROPHY_TIER_ORDER,
  label = 'Tier',
}: {
  sets: TierSlugSets | null
  value?: TierId
  onChange?: (tier: TierId) => void
  options?: readonly TierId[]
  label?: string
}) {
  const sizes = options.map((id) => sets?.[id].size ?? 0)

  return (
    <div role={onChange ? 'radiogroup' : 'list'} aria-label={label} className="flex flex-col gap-2">
      {options.map((id, i) => {
        const size = sizes[i]
        const selected = value === id
        const body = (
          <>
            <span className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="font-semibold">{TIER_LABELS[id]}</span>
              <span className="text-xs text-muted">
                {sets ? `${size} Pokémon · ${boxes(size)}` : '…'}
                {id === 'final-form' && <span className="ml-1.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">Quickest goal</span>}
                {id === 'living-form-full' && <span className="ml-1.5 rounded bg-purple-500/15 px-1.5 py-0.5 text-purple-700 dark:text-purple-300">Everything</span>}
              </span>
            </span>
            <span className="block text-sm">{TIER_INFO[id].summary}</span>
            <span className="block text-xs text-muted">
              <span className="font-medium">Includes:</span> {TIER_INFO[id].includes}{' '}
              <span className="font-medium">Skips:</span> {TIER_INFO[id].skips}
            </span>
          </>
        )
        const cardClass = `block rounded-xl border p-3 text-left ${selected ? 'border-brand bg-brand/10 ring-1 ring-brand' : 'border-border'}`
        if (!onChange) {
          return (
            <div key={id} role="listitem" className={cardClass}>
              {body}
            </div>
          )
        }
        return (
          <label key={id} className={`${cardClass} cursor-pointer hover:bg-border/20`}>
            <input
              type="radio"
              name={label}
              value={id}
              aria-label={TIER_LABELS[id]}
              checked={selected}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            {body}
          </label>
        )
      })}
    </div>
  )
}

export default TierCards
