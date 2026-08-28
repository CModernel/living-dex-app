import { useState, type FormEvent, type MouseEvent } from 'react'
import { useLists } from '../hooks/useLists'

// Shared by ListsPage (full-page management) and HomePage's left sidebar (3.6 follow-up:
// switching should refresh the table right there, not require a trip to /lists) — both
// contexts want the exact same list-of-lists + create-form behavior, just wrapped
// differently, so this owns the shared behavior and neither page duplicates it.
function ListSwitcher() {
  const { lists, activeListId, createNewList, switchTo, deleteList } = useLists()
  const [newListName, setNewListName] = useState('')

  function handleDelete(e: MouseEvent, id: string, name: string) {
    e.stopPropagation() // Don't also trigger the row's own switchTo click handler.
    if (window.confirm(`Delete "${name}"? This can't be undone.`)) deleteList(id)
  }

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
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-muted">{list.ownedIds.length} owned</span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, list.id, list.name)}
                aria-label={`Delete ${list.name}`}
                className="cursor-pointer rounded px-1 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </span>
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
