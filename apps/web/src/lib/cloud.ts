import { parseImport, serializeExport, DEFAULT_USER_STATE, type PokemonList } from '@living-dex/business-logic'
import type { Session, SupabaseClient } from '@supabase/supabase-js'

// 3.40 optional cloud sync. Configured by VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (both public, see docs/SUPABASE.md);
// without them every function here is unused and the Settings page shows no cloud section. The Supabase library is
// loaded with a dynamic import so it never weighs on the main bundle.

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const cloudConfigured = !!URL_ && !!KEY

const SCHEMA = 'living_dex'
const TABLE = 'user_state'

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

/** The signed-in user's lists from the cloud ([] when there is no row yet), validated like an import file. */
export async function pullLists(userId: string): Promise<PokemonList[]> {
  const client = await getClient()
  const { data, error } = await client.schema(SCHEMA).from(TABLE).select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return []
  const parsed = parseImport(JSON.stringify(data.data))
  if (!parsed.ok) throw new Error(`Cloud data could not be read: ${parsed.error}`)
  return parsed.lists
}

/** Replaces the user's cloud row with these lists (in the export envelope). */
export async function pushLists(userId: string, lists: Record<string, PokemonList>): Promise<void> {
  const client = await getClient()
  const envelope = JSON.parse(serializeExport({ ...DEFAULT_USER_STATE, lists }))
  const { error } = await client
    .schema(SCHEMA)
    .from(TABLE)
    .upsert({ user_id: userId, data: envelope, version: envelope.version }, { onConflict: 'user_id' })
  if (error) throw error
}
