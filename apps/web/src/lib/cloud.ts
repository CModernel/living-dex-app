import { parseImport, serializeExport, DEFAULT_USER_STATE, type PokemonList, type RemoteLists } from '@living-dex/business-logic'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { capabilities } from './edition'

// 3.40 optional cloud sync, only in the hosted edition (3.73, lib/edition.ts). Configured by VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (both public, see docs/SUPABASE.md);
// without them every function here is unused and the Settings page shows no cloud section. The Supabase library is
// loaded with a dynamic import so it never weighs on the main bundle.

// Read behind the capability so a community build does not even carry the values (the bundler drops the dead branch).
const COMMUNITY = import.meta.env.VITE_EDITION === 'community' // literal at build time, so the branches below fold away
const URL_ = !COMMUNITY ? (import.meta.env.VITE_SUPABASE_URL as string | undefined) : undefined
const KEY = !COMMUNITY ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) : undefined
export const cloudConfigured = capabilities.cloudSync && !!URL_ && !!KEY

const SCHEMA = 'living_dex'
const TABLE = 'user_state' // 3.40/3.41 v1: one row per user; only read now, to import data synced before 3.42
const LISTS = 'lists' // 3.42: one row per list, `deleted` marks a tombstone

let clientPromise: Promise<SupabaseClient> | null = null

export function getClient(): Promise<SupabaseClient> {
  if (!cloudConfigured) return Promise.reject(new Error('Cloud sync is not configured'))
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL_!, KEY!, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    }),
  )
  return clientPromise
}

/** Where sign-in links and Google send the user back: this app's Settings page (must be in Supabase's Redirect URLs). */
export const redirectTo = () => `${window.location.origin}${import.meta.env.BASE_URL}settings`

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await (await getClient()).auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
  if (error) throw error
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await (await getClient()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  await (await getClient()).auth.signOut()
}

/** Current session now and on every change; returns an unsubscribe function. */
export async function watchSession(cb: (session: Session | null) => void): Promise<() => void> {
  const client = await getClient()
  const { data } = await client.auth.getSession()
  cb(data.session)
  const { data: sub } = client.auth.onAuthStateChange((_event, session) => cb(session))
  return () => sub.subscription.unsubscribe()
}

/** v1 (3.41) cloud row: the user's lists ([] when there is no row), validated like an import file. Read once by 3.42 to
 * bring collections synced before per-list rows into the new table. */
export async function pullLists(userId: string): Promise<PokemonList[]> {
  const client = await getClient()
  const { data, error } = await client.schema(SCHEMA).from(TABLE).select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return []
  const parsed = parseImport(JSON.stringify(data.data))
  if (!parsed.ok) throw new Error(`Cloud data could not be read: ${parsed.error}`)
  return parsed.lists
}

const envelopeOf = (list: PokemonList) => JSON.parse(serializeExport({ ...DEFAULT_USER_STATE, lists: { [list.id]: list } }))

/** 3.42: every list row of the user: the list, or `null` for a list deleted on some device. Invalid rows throw. */
export async function pullListRows(userId: string): Promise<RemoteLists> {
  const client = await getClient()
  const { data, error } = await client.schema(SCHEMA).from(LISTS).select('list_id, data, deleted').eq('user_id', userId)
  if (error) throw error
  const rows: RemoteLists = {}
  for (const row of (data ?? []) as { list_id: string; data: unknown; deleted: boolean }[]) {
    if (row.deleted) {
      rows[row.list_id] = null
      continue
    }
    const parsed = parseImport(JSON.stringify(row.data))
    const list = parsed.ok ? parsed.lists.find((l) => l.id === row.list_id) : undefined
    if (!list) throw new Error(`Cloud list ${row.list_id} could not be read${parsed.ok ? '' : `: ${parsed.error}`}`)
    rows[row.list_id] = list
  }
  return rows
}

/** 3.42: writes these lists (upsert by list id); `null` marks a list deleted (tombstone kept so it does not come back). */
export async function pushListRows(userId: string, rows: RemoteLists): Promise<void> {
  const payload = Object.entries(rows).map(([listId, list]) => ({
    user_id: userId,
    list_id: listId,
    data: list ? envelopeOf(list) : {},
    deleted: !list,
  }))
  if (!payload.length) return
  const client = await getClient()
  const { error } = await client.schema(SCHEMA).from(LISTS).upsert(payload, { onConflict: 'user_id,list_id' })
  if (error) throw error
}

/** 3.44: deletes the signed-in account and all its cloud data (RPC `living_dex.delete_me`), then signs out here. */
export async function deleteAccount(): Promise<void> {
  const client = await getClient()
  const { error } = await client.schema(SCHEMA).rpc('delete_me')
  if (error) throw error
  await client.auth.signOut({ scope: 'local' })
}
