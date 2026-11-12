import { badgeTextColor, gameCode, gameStyle } from '../lib/gameColors'

export type GameChipOption = { id: string; name: string; note?: string; checked: boolean }

// Games as colored letter badges (3.38: "B" on blue, "Ye" on yellow; the full name is the tooltip and the accessible
// name) grouped by generation. Each badge keeps a real (visually hidden) checkbox so
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
                  title={`${option.name}${option.note ? ` (${option.note})` : ''}`}
                  className="cursor-pointer rounded-full pointer-coarse:p-0.5"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={() => onToggle(option.id)}
                    aria-label={`${option.name}${option.note ? ` (${option.note})` : ''}`}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="relative inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-xs font-bold shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] transition peer-checked:ring-2 peer-checked:ring-brand peer-checked:ring-offset-1 peer-checked:ring-offset-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand hover:brightness-95"
                    style={{
                      backgroundColor: gameStyle(option.id).color,
                      color: badgeTextColor(gameStyle(option.id).color),
                      opacity: option.checked ? 1 : 0.4,
                    }}
                  >
                    {gameCode(option.id)}
                    {option.note && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-background bg-foreground" />}
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
