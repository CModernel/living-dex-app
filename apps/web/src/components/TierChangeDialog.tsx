import type { TierId, TierSlugSets } from '@living-dex/business-logic'
import { TIER_LABELS } from '../lib/tiers'
import Dialog from './Dialog'

// Shown when the new working tier does not fit the list's box plan (3.19): switching would renumber every
// Box/Slot. Migrate keeps the original list untouched and starts a copy laid out for the new tier.
function TierChangeDialog({
  sets,
  to,
  layoutTier,
  onContinue,
  onMigrate,
  onCancel,
}: {
  sets: TierSlugSets
  to: TierId
  layoutTier: TierId
  onContinue: () => void
  onMigrate: () => void
  onCancel: () => void
}) {
  let extra = 0
  for (const slug of sets[to]) if (!sets[layoutTier].has(slug)) extra += 1

  return (
    <Dialog label="Change tier" onClose={onCancel} className="w-[28rem]">
      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Switch to {TIER_LABELS[to]}?</h3>
        <p className="text-sm">
          This list's boxes are planned for <strong>{TIER_LABELS[layoutTier]}</strong>. {TIER_LABELS[to]} adds {extra}{' '}
          Pokémon that don't fit that plan, so Box and Slot numbers would change.
        </p>
        <ul className="list-disc pl-5 text-sm text-muted">
          <li>
            <strong>Copy to a new list</strong>: keeps this list as it is and creates a copy (with everything you own)
            whose boxes are planned for {TIER_LABELS[to]}.
          </li>
          <li>
            <strong>Switch anyway</strong>: shows {TIER_LABELS[to]} here; Box/Slot follow it while you stay on it.
          </li>
        </ul>
        <div className="dialog-actions flex-wrap">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button type="button" onClick={onContinue} className="btn">
            Switch anyway
          </button>
          <button type="button" onClick={onMigrate} className="btn btn-primary">
            Copy to a new list
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default TierChangeDialog
