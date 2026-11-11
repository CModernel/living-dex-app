import { mergeImportedLists, parseImport, serializeExport } from '@living-dex/business-logic'
import { useRef, useState, type ChangeEvent } from 'react'
import { DISCLAIMER } from '../lib/disclaimer'
import { useUserState } from '../state/UserStateContext'

function SettingsPage() {
  const [state, setState] = useUserState()
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)

  function handleExport() {
    const blob = new Blob([serializeExport(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `living-dex-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // Lets the same file be picked again.
    if (!file) return
    const result = parseImport(await file.text())
    if (!result.ok) {
      setStatus({ ok: false, message: result.error })
      return
    }
    // Ids and time fixed up front so the updater is pure (it can be replayed or run twice).
    const ids = result.lists.map(() => crypto.randomUUID())
    const now = new Date()
    setState((prev) => {
      let next = 0
      return { ...prev, lists: mergeImportedLists(prev.lists, result.lists, () => ids[next++], now) }
    })
    const n = result.lists.length
    setStatus({ ok: true, message: `Imported ${n} collection${n === 1 ? '' : 's'}.` })
  }

  const buttonClass = 'btn'

  return (
    <div className="w-full max-w-md">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-4 text-muted">Preferences and app settings.</p>

      <section aria-label="Data" className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold">Data</h2>
        <p className="mb-3 text-xs text-muted">
          Export a backup of all your collections, or import one. Imported collections are added as new ones; nothing is
          overwritten.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className={buttonClass}>
            Export
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className={buttonClass}>
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            aria-label="Import file"
            className="hidden"
          />
        </div>
        {status && (
          <p role="status" className={`mt-3 text-sm ${status.ok ? '' : 'text-red-500'}`}>
            {status.message}
          </p>
        )}
      </section>

      <section aria-label="About" className="mt-4 rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold">About</h2>
        <p className="text-xs text-muted">{DISCLAIMER}</p>
      </section>
    </div>
  )
}

export default SettingsPage
