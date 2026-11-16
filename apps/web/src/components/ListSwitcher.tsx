import { resolveListTiers, validTargets, type TierId } from '@living-dex/business-logic'
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { useDataset } from '../hooks/useDataset'
import { useLists } from '../hooks/useLists'
import { TIER_LABELS, useTierSets } from '../lib/tiers'
import ConfirmDialog from './ConfirmDialog'
import Dialog from './Dialog'
import TierPicker from './TierPicker'

// Shared by ListsPage (full-page management) and HomePage's left sidebar (3.6 follow-up:
// switching should refresh the table right there, not require a trip to /lists) — both
// contexts want the exact same list-of-lists + create behavior, just wrapped differently,
// so this owns the shared behavior and neither page duplicates it. Deliberately has no
// outer border of its own — each consumer wraps it in its own panel styling, so this never
// ends up nested inside a second, redundant border.
//
const LIST_ICONS = ['⭐', '🏆', '✨', '🔥', '💧', '🌿', '⚡', '🎮', '📦', '❤️']

// 3.29: the per-list actions live in one "⋯" menu so the list name gets the row's width.
function RowMenu({
  name,
  onEdit,
  onClone,
  onDelete,
}: {
  name: string
  onEdit: (e: MouseEvent) => void
  onClone: (e: MouseEvent) => void
  onDelete: (e: MouseEvent) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent | globalThis.MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])
  const item = (label: string, handler: (e: MouseEvent) => void, icon: string) => (
    <button
      type="button"
      role="menuitem"
      aria-label={`${label} ${name}`}
      onClick={(e) => {
        setOpen(false)
        handler(e)
      }}
      className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-border/30"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
  return (
    <span ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="cursor-pointer rounded px-1.5 text-muted hover:text-foreground"
      >
        ⋯
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-1 w-32 rounded-lg border border-border bg-background p-1 text-foreground shadow-xl">
          {item('Edit', onEdit, '✎')}
          {item('Clone', onClone, '⧉')}
          {item('Delete', onDelete, '✕')}
        </div>
      )}
    </span>
  )
}

// `showCreate={false}`: the host (ListsSidebar, 3.61) renders its own aligned "+" and create dialog.
function ListSwitcher({ compact = false, showCreate = true }: { compact?: boolean; showCreate?: boolean }) {
  const { lists, activeListId, switchTo, deleteList, updateList, cloneList } = useLists()
  const { dataset } = useDataset()
  const tierSets = useTierSets(dataset)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editLayout, setEditLayout] = useState<TierId>('living-form')
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  const [cloning, setCloning] = useState<{ id: string; name: string } | null>(null)
  const editingList = editingId ? lists.find((l) => l.id === editingId) : undefined
  const editingTier = resolveListTiers(editingList).tier
  // Box layout choices (3.19b rule): the tier itself or a strict superset of it, never smaller.
  const layoutOptions: TierId[] = [editingTier, ...(tierSets ? validTargets(tierSets, editingTier) : [])]

  function openEditDialog(e: MouseEvent, id: string, name: string, icon?: string) {
    e.stopPropagation()
    setEditName(name)
    setEditIcon(icon ?? '')
    setEditLayout(resolveListTiers(lists.find((l) => l.id === id)).layoutTier)
    setEditingId(id)
  }

  function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    updateList(editingId, { name: editName, icon: editIcon, tier: editingTier, layoutTier: editLayout })
    setEditingId(null)
  }

  function handleClone(e: MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setCloning({ id, name: `${name} (copy)` })
  }

  function handleDelete(e: MouseEvent, id: string, name: string) {
    e.stopPropagation() // Don't also trigger the row's own switchTo click handler.
    setDeleting({ id, name })
  }

  function submitClone(e: FormEvent) {
    e.preventDefault()
    if (!cloning || !cloning.name.trim()) return
    cloneList(cloning.id, { name: cloning.name.trim() })
    setCloning(null)
  }

  const dialogs = (
    <>
      {isCreateOpen && (
        <Dialog label="Create new list" onClose={() => setIsCreateOpen(false)} className="w-[36rem]">
          <TierPicker onCreated={() => setIsCreateOpen(false)} />
        </Dialog>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          icon="🗑️"
          danger
          confirmLabel="Delete list"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteList(deleting.id)
            setDeleting(null)
          }}
        >
          This removes the list and everything you marked in it. This can't be undone. Tip: export a backup first in Settings.
        </ConfirmDialog>
      )}
      {cloning && (
        <Dialog label="Clone list" onClose={() => setCloning(null)}>
          <form onSubmit={submitClone} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Clone list</h3>
            <p className="text-sm text-muted">
              Makes an independent copy with everything you own, its tier, plan and filters. The copy becomes the active list.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Name for the copy
              <input
                autoFocus
                value={cloning.name}
                onChange={(e) => setCloning({ ...cloning, name: e.target.value })}
                onFocus={(e) => e.currentTarget.select()}
                maxLength={60}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setCloning(null)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={!cloning.name.trim()} className="btn btn-primary">
                Create copy
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {editingId && (
        <Dialog label="Edit list" onClose={() => setEditingId(null)}>
          <form onSubmit={handleEdit} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Edit list</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="List name"
              aria-label="List name"
              autoFocus
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div role="group" aria-label="Icon" className="flex flex-wrap gap-1">
              {['', ...LIST_ICONS].map((icon) => (
                <button
                  key={icon || 'none'}
                  type="button"
                  onClick={() => setEditIcon(icon)}
                  aria-label={icon ? `Icon ${icon}` : 'No icon'}
                  aria-pressed={editIcon === icon}
                  className={`h-9 w-9 cursor-pointer rounded-lg border text-base transition active:translate-y-px ${
                    editIcon === icon ? 'border-brand bg-brand/15' : 'border-border hover:bg-border/30'
                  }`}
                >
                  {icon || '∅'}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              Plan
              <select value={editLayout} onChange={(e) => setEditLayout(e.target.value as TierId)} className="btn select">
                {layoutOptions.map((id) => (
                  <option key={id} value={id}>
                    {TIER_LABELS[id]}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                The plan reserves slots so Box/Slot stay put as you grow. Pick a bigger tier if you plan to grow into it.
              </span>
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  )

  // 3.31 collapsed sidebar: one button per list (icon or initial) and "+".
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        {showCreate && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create new list"
            title="Create new list"
            className="btn btn-sm btn-icon h-8 w-8 text-base leading-none"
          >
            +
          </button>
        )}
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => switchTo(list.id)}
            aria-label={`Switch to ${list.name}`}
            aria-pressed={list.id === activeListId}
            title={`${list.name} · ${list.ownedIds.length} owned`}
            className={`h-8 w-8 cursor-pointer rounded-md border text-sm ${
              list.id === activeListId ? 'border-brand bg-brand/15' : 'border-border hover:bg-border/30'
            }`}
          >
            {list.icon || list.name.trim().charAt(0).toUpperCase() || '·'}
          </button>
        ))}
        {dialogs}
      </div>
    )
  }

  return (
    <div>
      {showCreate && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Create new list"
            title="Create new list"
            className="btn btn-sm btn-icon h-7 w-7 text-base leading-none"
          >
            +
          </button>
        </div>
      )}

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
            <span className="min-w-0 flex-1">
              <span className="block truncate">
                {list.icon && <span className="mr-1.5">{list.icon}</span>}
                {list.name}
              </span>
              <span className="block text-xs text-muted">{list.ownedIds.length} owned</span>
            </span>
            <RowMenu
              name={list.name}
              onEdit={(e) => openEditDialog(e, list.id, list.name, list.icon)}
              onClone={(e) => handleClone(e, list.id, list.name)}
              onDelete={(e) => handleDelete(e, list.id, list.name)}
            />
          </li>
        ))}
      </ul>

      {dialogs}
    </div>
  )
}

export default ListSwitcher
