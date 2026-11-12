import { useState, type FormEvent } from 'react'
import { useCloudSync } from '../hooks/useCloudSync'

// 3.40/3.41: optional sign-in and manual "Sync now" in Settings. Not rendered at all when this build has no cloud config.
function CloudSection() {
  const { configured, ready, session, status, lastSync, syncNow, signInWithEmail, signInWithGoogle, signOut } = useCloudSync()
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
              ? `Sync failed: ${status.message}`
              : lastSync
                ? `Last synced ${new Date(lastSync).toLocaleString()}`
                : 'Not synced yet on this device.'}
          </p>
          <p className="text-xs text-muted">
            Sync combines this device with the cloud: owned Pokémon are never removed. For now, un-marking a Pokémon or
            deleting a list comes back if another device still has it.
          </p>
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
        </div>
      )}
    </section>
  )
}

export default CloudSection
