import { typeColor } from '../lib/pokemonTypeColors'

function TypeBadge({ type }: { type: string }) {
  return (
    // `max-w-full` + `truncate` (rather than a fixed width) so the badge shrinks with its
    // container and truncates its own label with an ellipsis when space runs out, instead of
    // being hard-clipped mid-text by a parent's `overflow-hidden`.
    <span
      // `min-w-0` overrides the flex-item default (`min-width: auto`, i.e. "never shrink below
      // content size") — without it, `max-w-full`/`truncate` above have nothing to act on when
      // this badge sits inside the Types cell's `flex` row.
      className="inline-block min-w-0 max-w-full truncate rounded px-1.5 py-px text-center text-[10px] leading-4 font-semibold text-black uppercase dark:text-neutral-100"
      style={{ backgroundColor: typeColor(type) }}
    >
      {type}
    </span>
  )
}

export default TypeBadge
