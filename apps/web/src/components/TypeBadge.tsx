import { typeColor } from '../lib/pokemonTypeColors'

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white capitalize"
      style={{ backgroundColor: typeColor(type) }}
    >
      {type}
    </span>
  )
}

export default TypeBadge
