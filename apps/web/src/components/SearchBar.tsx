import { useEffect, useRef } from 'react'

// 3.32: big search box, always in the sticky stack. "/" focuses it from anywhere outside a text field.
function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      e.preventDefault()
      ref.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="relative">
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && (onChange(''), ref.current?.blur())}
        aria-label="Search Pokémon"
        placeholder="Search by name or Dex number…"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-sm outline-none placeholder:text-muted focus:border-brand"
      />
    </div>
  )
}

export default SearchBar
