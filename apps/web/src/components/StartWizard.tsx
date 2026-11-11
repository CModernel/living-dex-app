import { validTargets, type TierId } from '@living-dex/business-logic'
import { useState, type FormEvent } from 'react'
import { useDataset } from '../hooks/useDataset'
import { useLists } from '../hooks/useLists'
import { BEGINNER_TIP, TIER_LABELS, useTierSets } from '../lib/tiers'
import Dialog from './Dialog'
import TierCards from './TierCards'

// "Start" wizard (3.19). Step 1: name + starting tier, explained in plain language. Step 2 (skipped when
// nothing is bigger): is this the final goal, or will the collection grow? Growing plans the boxes for the
// target tier, so Box/Slot never has to move later; the extra slots simply stay free.
function StartWizard({ onClose }: { onClose: () => void }) {
  const { dataset } = useDataset()
  const sets = useTierSets(dataset)
  const { createNewList } = useLists()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('My Living Dex')
  const [tier, setTier] = useState<TierId>('living-form')
  const [grow, setGrow] = useState(false)
  const [target, setTarget] = useState<TierId>('living-form-full')

  const targets = sets ? validTargets(sets, tier) : []
  const needsStep2 = targets.length > 0

  function create() {
    const layoutTier = grow && targets.includes(target) ? target : tier
    createNewList(name.trim() || 'My Living Dex', { tier, layoutTier })
    onClose()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (step === 1 && needsStep2) {
      if (!targets.includes(target)) setTarget(targets[0])
      setStep(2)
    } else create()
  }

  return (
    <Dialog label="Start a new list" onClose={onClose} className="w-[34rem]">
      <form onSubmit={submit} className="flex flex-col gap-3">
        {step === 1 ? (
          <>
            <h3 className="text-base font-semibold">Start a new list</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="New list name"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="text-sm">
              Which Pokémon do you want to collect? Pick a goal; you can always grow it later.
            </p>
            <p className="rounded-lg bg-amber-500/10 p-2 text-xs">{BEGINNER_TIP}</p>
            <TierCards sets={sets} value={tier} onChange={setTier} label="Starting tier" />
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold">Is {TIER_LABELS[tier]} your final goal?</h3>
            <p className="text-sm text-muted">
              Box and Slot tell you where each Pokémon goes in your storage boxes. If you plan to grow, the boxes are
              numbered for the bigger goal now and the extra slots stay free, so nothing has to move later.
            </p>
            <div role="radiogroup" aria-label="Final goal" className="flex flex-col gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="goal" checked={!grow} onChange={() => setGrow(false)} />
                Yes, {TIER_LABELS[tier]} is my final goal
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="goal" checked={grow} onChange={() => setGrow(true)} />
                I'll grow it later
              </label>
            </div>
            {grow && <TierCards sets={sets} value={target} onChange={setTarget} options={targets} label="Grow into" />}
          </>
        )}
        <div className="flex justify-end gap-2">
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={!sets}>
            {step === 1 && needsStep2 ? 'Next' : 'Create'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export default StartWizard
