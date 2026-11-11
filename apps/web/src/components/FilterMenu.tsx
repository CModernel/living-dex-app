import GameChips from './GameChips'

type FilterToggle = {
  id: string
  label: string
  checked: boolean
  toggle: () => void
}

type GameOption = {
  id: string
  name: string
  selected: boolean
}

type GameSelection = {
  options: GameOption[]
  toggle: (gameId: string) => void
  selectAll: () => void
  selectNone: () => void
}

const OPTION_CLASS =
  'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm whitespace-nowrap hover:bg-border/30'
const LINK_BUTTON_CLASS = 'btn btn-ghost btn-sm'

function FilterMenu({ toggles, games }: { toggles: FilterToggle[]; games?: GameSelection }) {
  return (
    <details className="relative">
      <summary className="btn list-none [&::-webkit-details-marker]:hidden">
        Filters
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
        {toggles.map((toggle) => (
          <label key={toggle.id} className={OPTION_CLASS}>
            <input type="checkbox" checked={toggle.checked} onChange={toggle.toggle} className="cursor-pointer" />
            {toggle.label}
          </label>
        ))}
        {games && (
          // Which games count as "obtainable" for the Availability column and "Hide inaccessible" (3.8d).
          <fieldset aria-label="Games" className="mt-1 border-t border-border pt-2">
            <div className="flex items-center justify-between gap-3 px-1.5 pb-1">
              <span className="text-xs font-semibold tracking-wide text-muted uppercase">Games</span>
              <div className="flex gap-2">
                <button type="button" onClick={games.selectAll} className={LINK_BUTTON_CLASS}>
                  All
                </button>
                <button type="button" onClick={games.selectNone} className={LINK_BUTTON_CLASS}>
                  None
                </button>
              </div>
            </div>
            <div className="max-h-64 w-72 max-w-full overflow-y-auto p-1">
              <GameChips
                options={games.options.map((game) => ({ id: game.id, name: game.name, checked: game.selected }))}
                onToggle={games.toggle}
              />
            </div>
          </fieldset>
        )}
      </div>
    </details>
  )
}

export default FilterMenu
