import { serializeExport, DEFAULT_USER_STATE, DEFAULT_LIST_FILTER, type PokemonList } from '@living-dex/business-logic'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const list = (id: string, ownedIds: string[] = []): PokemonList => ({
  id, name: id, createdAt: '2026-01-01T00:00:00.000Z', dataVersion: 'v1', variant: 'normal', filter: DEFAULT_LIST_FILTER, ownedIds,
})

// A chainable stand-in for the bits of supabase-js the app uses.
const calls: Record<string, unknown[]> = {}
let row: unknown = null
let rowError: unknown = null
const fakeClient = {
  auth: {
    signInWithOtp: vi.fn(async (args: unknown) => ((calls.otp = [args]), { error: null })),
    signInWithOAuth: vi.fn(async (args: unknown) => ((calls.oauth = [args]), { error: null })),
  },
  schema: vi.fn((schema: string) => {
    calls.schema = [schema]
    return {
      from: (table: string) => {
        calls.table = [table]
        return {
          select: () => ({ eq: (_c: string, id: string) => ((calls.eq = [id]), { maybeSingle: async () => ({ data: row, error: rowError }) }) }),
          upsert: async (value: unknown, opts: unknown) => ((calls.upsert = [value, opts]), { error: null }),
        }
      },
    }
  }),
}
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => fakeClient) }))

async function load(configured = true) {
  vi.resetModules()
  if (configured) {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key')
  }
  return import('./cloud')
}

beforeEach(() => {
  row = null
  rowError = null
  for (const k of Object.keys(calls)) delete calls[k]
})
afterEach(() => vi.unstubAllEnvs())

test('without the env vars the cloud is off and the client is never created', async () => {
  const cloud = await load(false)
  expect(cloud.cloudConfigured).toBe(false)
  await expect(cloud.getClient()).rejects.toThrow('not configured')
})

test('sign-in links and Google return to this app\'s Settings page', async () => {
  const cloud = await load()
  // BASE_URL is /living-dex-app/ in the real build, / under vitest.
  const settingsUrl = `${window.location.origin}${import.meta.env.BASE_URL}settings`
  await cloud.signInWithEmail('ash@example.com')
  expect(calls.otp[0]).toMatchObject({ email: 'ash@example.com', options: { emailRedirectTo: settingsUrl } })
  await cloud.signInWithGoogle()
  expect(calls.oauth[0]).toMatchObject({ provider: 'google', options: { redirectTo: settingsUrl } })
})

test('pull reads the user\'s own row in the living_dex schema and validates it like an import', async () => {
  const cloud = await load()
  expect(await cloud.pullLists('user-1')).toEqual([]) // no row yet
  row = { data: JSON.parse(serializeExport({ ...DEFAULT_USER_STATE, lists: { a: list('a', ['x']) } })) }
  const lists = await cloud.pullLists('user-1')
  expect(lists.map((l) => [l.id, l.ownedIds])).toEqual([['a', ['x']]])
  expect(calls.schema).toEqual(['living_dex'])
  expect(calls.table).toEqual(['user_state'])
  expect(calls.eq).toEqual(['user-1'])
  row = { data: { app: 'something-else' } }
  await expect(cloud.pullLists('user-1')).rejects.toThrow('could not be read')
  row = null
  rowError = new Error('permission denied')
  await expect(cloud.pullLists('user-1')).rejects.toThrow('permission denied')
})

test('push upserts the envelope for the user\'s own row', async () => {
  const cloud = await load()
  await cloud.pushLists('user-1', { a: list('a', ['x']) })
  const [value, opts] = calls.upsert as [{ user_id: string; data: { app: string; state: { lists: Record<string, PokemonList> } }; version: number }, unknown]
  expect(value.user_id).toBe('user-1')
  expect(value.data.app).toBe('living-dex')
  expect(value.data.state.lists.a.ownedIds).toEqual(['x'])
  expect(value.version).toBe(1)
  expect(opts).toEqual({ onConflict: 'user_id' })
})
