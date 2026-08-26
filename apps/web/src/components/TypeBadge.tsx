import { typeColor } from '../lib/pokemonTypeColors'

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className="inline-flex w-20 items-center justify-center rounded px-2 py-0.5 text-xs font-medium text-black uppercase"
      style={{ backgroundColor: typeColor(type) }}
    >
      {type}
    </span>
  )
}

export default TypeBadge
