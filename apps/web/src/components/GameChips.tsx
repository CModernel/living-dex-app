import { gameStyle } from '../lib/gameColors'

export type GameChipOption = { id: string; name: string; note?: string; checked: boolean }

// Games as colored chips grouped by generation. Each chip keeps a real (visually hidden) checkbox so
// keyboard and screen-reader behavior is a normal checklist; the chip itself shows the state.
function GameChips({ options, onToggle }: { options: GameChipOption[]; onToggle: (id: string) => void }) {
  const groups = new Map<number, GameChipOption[]>()
  for (const option of options) {
    const gen = gameStyle(option.id).generation
    groups.set(gen, [...(groups.get(gen) ?? []), option])
  }
  return (
    <div className="flex flex-col gap-2">
      {[...groups.entries()]
        .sort(([a], [b]) => a - b)
        .map(([gen, items]) => (
          <div key={gen}>
            {gen > 0 && <p className="mb-1 px-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">Gen {gen}</p>}
            <div className="flex flex-wrap gap-1.5">
              {items.map((option) => (
                <label
                  key={option.id}
                  className="cursor-pointer rounded-full pointer-coarse:py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={() => onToggle(option.id)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1.5 text-xs font-medium whitespace-nowrap text-muted transition peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-brand hover:border-foreground/30">
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]"
                      style={{ backgroundColor: gameStyle(option.id).color, opacity: option.checked ? 1 : 0.45 }}
                    />
                    <span>
                      {option.name}
                      {/* Separate text node: a space inside the span is dropped from the accessible name. */}
                      {option.note && ' '}
                      {option.note && <span className="font-normal text-muted">({option.note})</span>}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

export default GameChips
