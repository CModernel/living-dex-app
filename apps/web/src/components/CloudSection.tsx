import { useState, type FormEvent } from 'react'
import { useCloudSync } from '../state/CloudSyncContext'
import ConfirmDialog from './ConfirmDialog'

const CONFIRM_WORD = 'DELETE'

// 3.44: what the cloud keeps, in plain words (also in docs/PRIVACY.md).
function PrivacyNote() {
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer select-none">Privacy</summary>
      <p className="mt-1">
        With an account, Living Dex stores your email address (to sign you in) and your collections (to sync them). They
        live in this app's own database, readable only by your account. No ads, no tracking, nothing is sold or shared.
        Without an account nothing leaves this device. You can export your data or delete your account at any time.
      </p>
    </details>
  )
}

// 3.40/3.41/3.42: optional sign-in, automatic sync status and a manual "Sync now" in Settings. Not rendered at all when this build has no cloud config.
function CloudSection({ onExport }: { onExport?: () => void }) {
  const { configured, ready, session, status, lastSync, syncNow, signInWithEmail, signInWithGoogle, signOut, deleteAccount } =
    useCloudSync()
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!configured) return null

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function confirmDelete() {
    setDeleteError(null)
    try {
      await deleteAccount()
      setDeleting(false)
      setConfirmText('')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err))
    }
  }

  async function google() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section aria-label="Cloud sync" className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold">Cloud sync</h2>
      {!ready ? (
        <p className="text-xs text-muted">Loading…</p>
      ) : session ? (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            Signed in as <strong>{session.user.email ?? 'your account'}</strong>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={syncNow} disabled={status.kind === 'syncing'} className="btn btn-primary">
              {status.kind === 'syncing' ? 'Syncing…' : 'Sync now'}
            </button>
            <button type="button" onClick={signOut} className="btn btn-ghost">
              Sign out
            </button>
          </div>
          <p role="status" className="text-xs text-muted">
            {status.kind === 'error'
              ? `Sync failed: ${status.message}. Retrying automatically.`
              : status.kind === 'offline'
                ? 'Offline: changes will sync when you are back online.'
                : lastSync
                ? `Last synced ${new Date(lastSync).toLocaleString()}`
                : 'Not synced yet on this device.'}
          </p>
          <p className="text-xs text-muted">
            Your collections sync automatically while you are signed in: changes go up a couple of seconds after you
            make them and come down when you open the app. Changes made offline are sent when you are back online.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border pt-2">
            {onExport && (
              <button type="button" onClick={onExport} className="btn btn-sm">
                Export a backup
              </button>
            )}
            <button type="button" onClick={() => setDeleting(true)} className="btn btn-sm btn-ghost text-red-600 hover:text-red-700">
              Delete account…
            </button>
          </div>
          <PrivacyNote />
          {deleting && (
            <ConfirmDialog
              title="Delete your account?"
              icon="⚠️"
              danger
              confirmLabel="Delete account"
              confirmDisabled={confirmText !== CONFIRM_WORD}
              onCancel={() => {
                setDeleting(false)
                setConfirmText('')
                setDeleteError(null)
              }}
              onConfirm={confirmDelete}
            >
              <p>
                This deletes your account and the collections stored in the cloud. The collections on this device stay
                here. This can't be undone.
              </p>
              {onExport && (
                <button type="button" onClick={onExport} className="btn btn-sm mt-2">
                  Export a backup first
                </button>
              )}
              <label className="mt-3 block text-xs">
                Type {CONFIRM_WORD} to confirm
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              {deleteError && (
                <p role="alert" className="mt-2 text-xs text-red-500">
                  Could not delete the account: {deleteError}
                </p>
              )}
            </ConfirmDialog>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-xs text-muted">
            Optional. Sign in to back up your collections and use them on other devices. Without an account everything
            stays on this device.
          </p>
          {sent ? (
            <p role="status">Check your email for the sign-in link.</p>
          ) : (
            <form onSubmit={sendLink} className="flex flex-wrap gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                autoComplete="email"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button type="submit" className="btn btn-primary">
                Send magic link
              </button>
            </form>
          )}
          <button type="button" onClick={google} className="btn self-start">
            Continue with Google
          </button>
          {error && (
            <p role="alert" className="text-xs text-red-500">
              {error}
            </p>
          )}
          <PrivacyNote />
        </div>
      )}
    </section>
  )
}

export default CloudSection
