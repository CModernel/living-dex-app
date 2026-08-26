type HideableColumn = {
  id: string
  label: string
  isVisible: boolean
  toggle: () => void
}

function ColumnVisibilityMenu({ columns }: { columns: HideableColumn[] }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded border border-border px-2 py-1 text-sm select-none">
        Columns
      </summary>
      <div className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded border border-border bg-background p-2 shadow-lg">
        {columns.map((column) => (
          <label key={column.id} className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
            <input type="checkbox" checked={column.isVisible} onChange={column.toggle} className="cursor-pointer" />
            {column.label}
          </label>
        ))}
      </div>
    </details>
  )
}

export default ColumnVisibilityMenu
