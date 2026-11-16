import { rowsToPush, sameLists, syncLists, type PokemonList, type RemoteLists } from '@living-dex/business-logic'
import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as cloud from '../lib/cloud'
import { useIsHydrated, useUserState } from './UserStateContext'

// 3.42 automatic sync. Signed in, this device pulls on start, when the window regains focus or the network comes back,
// and pushes 2 s after the lists change. The last synced copy ("base", per user, in localStorage) drives the three-way
// merge (business-logic syncLists) and doubles as the offline queue: whatever differs from it is still to be pushed, so
// edits made offline survive reloads with no separate queue.

const LAST_SYNC_KEY = 'living-dex:last-sync' // per device
const BASE_KEY = 'living-dex:sync-base' // { userId, lists }
const PUSH_DELAY_MS = 2000
const RETRY_MS = [15_000, 60_000, 300_000]

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'done' }
  | { kind: 'offline' }
  | { kind: 'error'; message: string }

type Base = { userId: string; lists: Record<string, PokemonList> }

function readBase(userId: string): Record<string, PokemonList> | null {
  try {
    const raw = localStorage.getItem(BASE_KEY)
    const base = raw ? (JSON.parse(raw) as Base) : null
    return base && base.userId === userId && base.lists ? base.lists : null
  } catch {
    return null
  }
}

function writeBase(userId: string, lists: Record<string, PokemonList>) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify({ userId, lists } satisfies Base))
  } catch {
    // storage full or blocked: the next sync falls back to the union merge
  }
}

/** Forgets the last synced copy (account deleted or signed out for good). */
export function clearSyncBase() {
  try {
    localStorage.removeItem(BASE_KEY)
    localStorage.removeItem(LAST_SYNC_KEY)
  } catch {
    // nothing to clear
  }
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export type CloudSync = {
  configured: boolean
  ready: boolean
  session: Session | null
  status: SyncStatus
  lastSync: string | null
  syncNow: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** 3.44: deletes the account and its cloud data; this device keeps its collections. */
  deleteAccount: () => Promise<void>
}

const NOT_CONFIGURED: CloudSync = {
  configured: false,
  ready: false,
  session: null,
  status: { kind: 'idle' },
  lastSync: null,
  syncNow: async () => {},
  signInWithEmail: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
}

const CloudSyncContext = createContext<CloudSync>(NOT_CONFIGURED)

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useUserState()
  const hydrated = useIsHydrated()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<SyncStatus>({ kind: 'idle' })
  const [lastSync, setLastSync] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_SYNC_KEY)
    } catch {
      return null
    }
  })

  // Latest values for the async sync run (it must not restart when they change).
  const listsRef = useRef(state.lists)
  listsRef.current = state.lists
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = session?.user.id ?? null
  const hydratedRef = useRef(hydrated)
  hydratedRef.current = hydrated
  const running = useRef(false)
  const again = useRef(false)
  const retry = useRef<{ attempt: number; timer?: ReturnType<typeof setTimeout> }>({ attempt: 0 })

  useEffect(() => {
    if (!cloud.cloudConfigured) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    cloud
      .watchSession((s) => {
        if (cancelled) return
        setSession(s)
        setReady(true)
      })
      .then((unsub) => (cancelled ? unsub() : (unsubscribe = unsub)))
      .catch((error: Error) => {
        setReady(true)
        setStatus({ kind: 'error', message: error.message })
      })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const syncNow = useCallback(async (): Promise<void> => {
    const userId = userIdRef.current
    if (!userId || !hydratedRef.current) return
    if (running.current) {
      again.current = true
      return
    }
    if (isOffline()) {
      setStatus({ kind: 'offline' })
      return
    }
    clearTimeout(retry.current.timer)
    running.current = true
    setStatus({ kind: 'syncing' })
    try {
      const rows = await cloud.pullListRows(userId)
      const savedBase = readBase(userId)
      let remote: RemoteLists = rows
      // First sync after 3.42 for this account: bring in what v1 "Sync now" stored in the single user row.
      if (!savedBase && Object.keys(rows).length === 0) {
        remote = Object.fromEntries((await cloud.pullLists(userId)).map((list) => [list.id, list]))
      }
      const base = savedBase ?? {}
      const local = listsRef.current
      const { lists } = syncLists(base, local, remote)
      setState((prev) => {
        // A change made while the pull was in flight is merged too; it differs from the new base, so it is pushed next.
        const next = prev.lists === local ? lists : syncLists(base, prev.lists, remote).lists
        const activeListId = prev.activeListId && next[prev.activeListId] ? prev.activeListId : (Object.keys(next)[0] ?? null)
        return { ...prev, lists: next, activeListId }
      })
      await cloud.pushListRows(userId, rowsToPush(lists, rows))
      writeBase(userId, lists)
      const now = new Date().toISOString()
      try {
        localStorage.setItem(LAST_SYNC_KEY, now)
      } catch {
        // storage unavailable: the time just isn't remembered
      }
      setLastSync(now)
      setStatus({ kind: 'done' })
      retry.current.attempt = 0
    } catch (error) {
      if (isOffline()) setStatus({ kind: 'offline' })
      else setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
      const delay = RETRY_MS[Math.min(retry.current.attempt, RETRY_MS.length - 1)]
      retry.current.attempt += 1
      retry.current.timer = setTimeout(() => void syncNow(), delay)
    } finally {
      running.current = false
      if (again.current) {
        again.current = false
        void syncNow()
      }
    }
  }, [setState])

  const userId = session?.user.id ?? null

  // Pull on sign-in / start, on focus, when the tab becomes visible and when the network comes back.
  useEffect(() => {
    if (!userId || !hydrated) return
    void syncNow()
    const onVisible = () => document.visibilityState === 'visible' && void syncNow()
    const onOnline = () => void syncNow()
    const onOffline = () => setStatus({ kind: 'offline' })
    window.addEventListener('focus', onOnline)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    const retryState = retry.current
    return () => {
      window.removeEventListener('focus', onOnline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(retryState.timer)
    }
  }, [userId, hydrated, syncNow])

  // Push shortly after a local change (anything that differs from the last synced copy).
  useEffect(() => {
    if (!userId || !hydrated) return
    const timer = setTimeout(() => {
      const base = readBase(userId)
      if (base && !sameLists(state.lists, base)) void syncNow()
    }, PUSH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [state.lists, userId, hydrated, syncNow])

  const value = useMemo<CloudSync>(
    () => ({
      configured: cloud.cloudConfigured,
      ready,
      session,
      status,
      lastSync,
      syncNow,
      signInWithEmail: cloud.signInWithEmail,
      signInWithGoogle: cloud.signInWithGoogle,
      signOut: cloud.signOut,
      deleteAccount: async () => {
        await cloud.deleteAccount()
        clearSyncBase()
        setLastSync(null)
        setStatus({ kind: 'idle' })
      },
    }),
    [ready, session, status, lastSync, syncNow],
  )

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>
}

/** Cloud session and sync state; outside a CloudSyncProvider it reports "not configured". */
export function useCloudSync(): CloudSync {
  return useContext(CloudSyncContext)
}
