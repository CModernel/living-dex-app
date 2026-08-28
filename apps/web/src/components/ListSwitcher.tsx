import { useState, type FormEvent, type MouseEvent } from 'react'
import { useLists } from '../hooks/useLists'

// Shared by ListsPage (full-page management) and HomePage's left sidebar (3.6 follow-up:
// switching should refresh the table right there, not require a trip to /lists) — both
// contexts want the exact same list-of-lists + create behavior, just wrapped differently,
// so this owns the shared behavior and neither page duplicates it. Deliberately has no
// outer border of its own — each consumer wraps it in its own panel styling, so this never
// ends up nested inside a second, redundant border.
//
// The create dialog here is intentionally plain (see TODO.md's "Polished create-list
// dialog" idea for the animated/backdrop-blur version) — a user request for later, not
// this pass.
function ListSwitcher() {
  const { lists, activeListId, createNewList, switchTo, deleteList } = useLists()
  const [newListName, setNewListName] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  function openCreateDialog() {
    setNewListName('')
    setIsCreateOpen(true)
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    createNewList(name)
    setIsCreateOpen(false)
  }

  function handleDelete(e: MouseEvent, id: string, name: string) {
    e.stopPropagation() // Don't also trigger the row's own switchTo click handler.
    if (window.confirm(`Delete "${name}"? This can't be undone.`)) deleteList(id)
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={openCreateDialog}
          aria-label="Create new list"
          title="Create new list"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border text-base leading-none hover:bg-border/30"
        >
          +
        </button>
      </div>

      {lists.length === 0 && <p className="mb-3 text-sm text-muted">You don't have any lists yet.</p>}

      <ul className="divide-y divide-border">
        {lists.map((list) => (
          <li
            key={list.id}
            onClick={() => switchTo(list.id)}
            className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-border/20 ${
              list.id === activeListId ? 'bg-brand/15' : ''
            }`}
          >
            <span className="truncate">{list.name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted">{list.ownedIds.length} owned</span>
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

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create new list"
            onClick={(e) => e.stopPropagation()}
            className="w-72 rounded-lg border border-border bg-background p-4 shadow-lg"
          >
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">New list</h3>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                aria-label="New list name"
                autoFocus
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="cursor-pointer rounded-md border border-border px-2.5 py-1.5 text-sm hover:bg-border/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-brand px-2.5 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListSwitcher
