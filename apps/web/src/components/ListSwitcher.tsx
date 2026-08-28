import { useState, type FormEvent } from 'react'
import { useLists } from '../hooks/useLists'

// Shared by ListsPage (full-page management) and HomePage's left sidebar (3.6 follow-up:
// switching should refresh the table right there, not require a trip to /lists) — both
// contexts want the exact same list-of-lists + create-form behavior, just wrapped
// differently, so this owns the shared behavior and neither page duplicates it.
function ListSwitcher() {
  const { lists, activeListId, createNewList, switchTo } = useLists()
  const [newListName, setNewListName] = useState('')

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    createNewList(name)
    setNewListName('')
  }

  return (
    <div>
      {lists.length === 0 && <p className="mb-4 text-muted">You don't have any lists yet.</p>}

      <ul className="mb-4">
        {lists.map((list) => (
          <li
            key={list.id}
            onClick={() => switchTo(list.id)}
            className={`flex cursor-pointer items-center justify-between border-b border-border p-2 ${
              list.id === activeListId ? 'bg-brand/15' : ''
            }`}
          >
            <span className="truncate">{list.name}</span>
            <span className="shrink-0 text-sm text-muted">{list.ownedIds.length} owned</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleCreate} className="flex flex-col gap-2">
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="List name"
          aria-label="New list name"
          className="rounded border border-border bg-background px-2 py-1"
        />
        <button
          type="submit"
          className="cursor-pointer rounded border border-border px-2 py-1 text-sm"
        >
          {lists.length === 0 ? 'Create my first list' : 'Create list'}
        </button>
      </form>
    </div>
  )
}

export default ListSwitcher
