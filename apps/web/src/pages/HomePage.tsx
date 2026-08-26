import { getSpriteUrl } from '@living-dex/business-logic'
import { TIERS, type TierId } from '@cmodernel/living-dex-tiers'
import { useState } from 'react'
import TypeBadge from '../components/TypeBadge'
import { useActiveList } from '../hooks/useActiveList'
import { useDataset } from '../hooks/useDataset'

const TIER_LABELS: Record<TierId, string> = {
  'living-form': 'Living Form',
  'living-lite': 'Living Lite',
  'final-form-full': 'Final Form Full',
  'final-form': 'Final Form',
}

function HomePage() {
  const result = useDataset()
  const { activeList, toggleOwned } = useActiveList()
  const [tierId, setTierId] = useState<TierId>('living-form')

  if (result.loading) {
    return <p className="text-muted">Loading Pokémon data…</p>
  }

  if (result.error) {
    return <p className="text-muted">Failed to load dataset: {result.error.message}</p>
  }

  const { dataset } = result
  const entries = Object.values(dataset.pokemon)
    .filter(TIERS[tierId].predicate)
    .sort((a, b) => a.sortIndex - b.sortIndex)
  const ownedIds = new Set(activeList?.ownedIds ?? [])

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Living Dex</h1>
        <label className="flex items-center gap-2 text-sm">
          Tier
          <select
            value={tierId}
            onChange={(e) => setTierId(e.target.value as TierId)}
            className="cursor-pointer rounded border border-border bg-background px-2 py-1"
          >
            {(Object.keys(TIER_LABELS) as TierId[]).map((id) => (
              <option key={id} value={id}>
                {TIER_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-2" aria-label="Sprite" />
            <th className="p-2">Name</th>
            <th className="p-2">Types</th>
            <th className="p-2 text-center">Owned</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const owned = ownedIds.has(entry.slug)
            const spriteUrl = getSpriteUrl(dataset, entry) ?? undefined

            return (
              <tr
                key={entry.slug}
                onClick={() => toggleOwned(entry.slug)}
                className={`cursor-pointer border-b border-border ${owned ? 'bg-brand/15' : ''}`}
              >
                <td className="p-2">
                  <div className="group relative inline-block">
                    <img
                      src={spriteUrl}
                      alt=""
                      loading="lazy"
                      style={{ width: 48, height: 48, maxWidth: 'none' }}
                    />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded border border-border bg-background p-2 shadow-lg group-hover:block">
                      <img src={spriteUrl} alt="" style={{ width: 96, height: 96, maxWidth: 'none' }} />
                    </div>
                  </div>
                </td>
                <td className="p-2">{entry.name}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    {entry.types.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </div>
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={owned}
                    onChange={() => toggleOwned(entry.slug)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Mark ${entry.name} as owned`}
                    className="cursor-pointer"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default HomePage
