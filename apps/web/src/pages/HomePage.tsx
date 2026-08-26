import { getSpriteUrl } from '@living-dex/business-logic'
import { TIERS } from '@cmodernel/living-dex-tiers'
import { useActiveList } from '../hooks/useActiveList'
import { useDataset } from '../hooks/useDataset'

function HomePage() {
  const result = useDataset()
  const { activeList, toggleOwned } = useActiveList()

  if (result.loading) {
    return <p className="text-muted">Loading Pokémon data…</p>
  }

  if (result.error) {
    return <p className="text-muted">Failed to load dataset: {result.error.message}</p>
  }

  const { dataset } = result
  const entries = Object.values(dataset.pokemon)
    .filter(TIERS['living-form'].predicate)
    .sort((a, b) => a.sortIndex - b.sortIndex)
  const ownedIds = new Set(activeList?.ownedIds ?? [])

  return (
    <div className="w-full">
      <h1 className="mb-4 text-center text-2xl font-semibold">Living Dex</h1>
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
          {entries.map((entry) => (
            <tr key={entry.slug} className="border-b border-border">
              <td className="p-2">
                <img
                  src={getSpriteUrl(dataset, entry) ?? undefined}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                />
              </td>
              <td className="p-2">{entry.name}</td>
              <td className="p-2">{entry.types.join(', ')}</td>
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={ownedIds.has(entry.slug)}
                  onChange={() => toggleOwned(entry.slug)}
                  aria-label={`Mark ${entry.name} as owned`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default HomePage
