export type ViewMode = 'table' | 'grid'

const OPTIONS: { mode: ViewMode; label: string }[] = [
  { mode: 'table', label: '☰ Table' },
  { mode: 'grid', label: '▦ Grid' },
]

// 3.50/3.51: Table | Grid as a segmented toggle with a fixed width, so it never moves when other toolbar buttons
// (Columns) appear or disappear. Accessible names stay "Switch to <mode> view".
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-lg border border-border shadow-sm">
      {OPTIONS.map(({ mode, label }) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            aria-label={`Switch to ${mode} view`}
            title={`Switch to ${mode} view`}
            onClick={() => !active && onChange(mode)}
            className={`w-20 cursor-pointer px-2.5 py-1.5 text-sm ${
              active ? 'bg-brand text-white' : 'bg-background text-foreground hover:bg-border/30'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default ViewToggle
