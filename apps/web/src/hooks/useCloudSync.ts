import { mergeLists } from '@living-dex/business-logic'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import * as cloud from '../lib/cloud'
import { useUserState } from '../state/UserStateContext'

const LAST_SYNC_KEY = 'living-dex:last-sync' // per device

export type SyncStatus = { kind: 'idle' } | { kind: 'syncing' } | { kind: 'done' } | { kind: 'error'; message: string }

/** 3.41 manual sync: session state plus "Sync now" (pull → merge → save locally → push the merged lists). */
export function useCloudSync() {
  const [state, setState] = useUserState()
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

  const syncNow = useCallback(async () => {
    if (!session) return
    setStatus({ kind: 'syncing' })
    try {
      const remote = await cloud.pullLists(session.user.id)
      const merged = mergeLists(state.lists, remote)
      // Apply the same merge to the latest state (a change made while the pull was in flight is kept).
      setState((prev) => ({ ...prev, lists: mergeLists(prev.lists, remote), activeListId: prev.activeListId ?? Object.keys(merged)[0] ?? null }))
      await cloud.pushLists(session.user.id, merged)
      const now = new Date().toISOString()
      try {
        localStorage.setItem(LAST_SYNC_KEY, now)
      } catch {
        // storage unavailable: the time just isn't remembered
      }
      setLastSync(now)
      setStatus({ kind: 'done' })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }, [session, state.lists, setState])

  return {
    configured: cloud.cloudConfigured,
    ready,
    session,
    status,
    lastSync,
    syncNow,
    signInWithEmail: cloud.signInWithEmail,
    signInWithGoogle: cloud.signInWithGoogle,
    signOut: cloud.signOut,
  }
}
