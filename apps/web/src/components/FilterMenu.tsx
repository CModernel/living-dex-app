type FilterToggle = {
  id: string
  label: string
  checked: boolean
  toggle: () => void
}

function FilterMenu({ toggles }: { toggles: FilterToggle[] }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-sm select-none hover:border-muted">
        Filters
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
        {toggles.map((toggle) => (
          <label
            key={toggle.id}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm whitespace-nowrap hover:bg-border/30"
          >
            <input type="checkbox" checked={toggle.checked} onChange={toggle.toggle} className="cursor-pointer" />
            {toggle.label}
          </label>
        ))}
      </div>
    </details>
  )
}

export default FilterMenu
