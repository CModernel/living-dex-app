import { Link } from 'react-router'
import { useCloudSync, type SyncStatus } from '../state/CloudSyncContext'

const LABEL: Record<SyncStatus['kind'], { text: string; dot: string }> = {
  idle: { text: 'Synced', dot: 'bg-emerald-500' },
  done: { text: 'Synced', dot: 'bg-emerald-500' },
  syncing: { text: 'Syncing…', dot: 'bg-sky-500 animate-pulse' },
  offline: { text: 'Offline', dot: 'bg-amber-500' },
  error: { text: 'Sync error', dot: 'bg-red-500' },
}

// 3.42: small header status for automatic sync, only when signed in. Links to Settings → Cloud sync for details.
function SyncIndicator() {
  const { configured, session, status } = useCloudSync()
  if (!configured || !session) return null
  const { text, dot } = LABEL[status.kind]
  return (
    <Link
      to="/settings"
      role="status"
      aria-label={`Cloud sync: ${text}`}
      title={status.kind === 'error' ? status.message : undefined}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </Link>
  )
}

export default SyncIndicator
