import { clearOwned, DEFAULT_USER_STATE, markOwned, type PokemonList } from '@living-dex/business-logic'
import { useState } from 'react'
import { useActiveList } from '../hooks/useActiveList'
import { useLists } from '../hooks/useLists'
import { useDataset } from '../hooks/useDataset'
import { useUserState } from '../state/UserStateContext'

// Dev-only (TODO 3.20): shortcuts to reproduce a brand-new user without clicking through the table.
// Only ever imported when `import.meta.env.DEV` (see App.tsx), so it is not part of the production bundle.
export default function DebugPanel() {
  const [open, setOpen] = useState(true)
  const [state, setState] = useUserState()
  const { dataset } = useDataset()
  const { activeList } = useActiveList()
  const { createNewList } = useLists()
  const slugs = dataset ? Object.keys(dataset.pokemon) : []
  const update = (fn: (list: PokemonList) => PokemonList) =>
    setState((prev) => {
      const list = prev.activeListId ? prev.lists[prev.activeListId] : undefined
      return list ? { ...prev, lists: { ...prev.lists, [list.id]: fn(list) } } : prev
    })

  return (
    <section
      role="region"
      aria-label="Debug"
      className="fixed bottom-2 left-2 z-50 max-w-60 rounded-lg border border-amber-400 bg-amber-50 p-2 text-xs text-amber-950 shadow-lg dark:bg-amber-950 dark:text-amber-50"
    >
      <button type="button" className="font-semibold" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Debug {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          <p>
            {Object.keys(state.lists).length} list(s), {activeList?.ownedIds.length ?? 0} owned
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => createNewList('Debug list', { tier: 'living-form', layoutTier: 'living-form' })}
          >
            Quick start
          </button>
          <button type="button" className="btn btn-sm" onClick={() => update((l) => markOwned(l, slugs.slice(0, 10)))}>
            Mark first 10
          </button>
          <button type="button" className="btn btn-sm" onClick={() => update((l) => markOwned(l, slugs))}>
            Mark all
          </button>
          <button type="button" className="btn btn-sm" onClick={() => update(clearOwned)}>
            Clear owned
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setState(DEFAULT_USER_STATE)}>
            Reset all data
          </button>
        </div>
      )}
    </section>
  )
}
