import { serializeExport, DEFAULT_USER_STATE, DEFAULT_LIST_FILTER, type PokemonList } from '@living-dex/business-logic'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const list = (id: string, ownedIds: string[] = []): PokemonList => ({
  id, name: id, createdAt: '2026-01-01T00:00:00.000Z', dataVersion: 'v1', variant: 'normal', filter: DEFAULT_LIST_FILTER, ownedIds,
})

// A chainable stand-in for the bits of supabase-js the app uses.
const calls: Record<string, unknown[]> = {}
let row: unknown = null
let rowError: unknown = null
let listRows: unknown[] = []
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
          select: () => ({
            eq: (_c: string, id: string) => {
              calls.eq = [id]
              const result = { data: listRows, error: rowError }
              // `.maybeSingle()` for the v1 row; awaited directly for the 3.42 per-list rows.
              return { maybeSingle: async () => ({ data: row, error: rowError }), then: (ok: (r: typeof result) => unknown) => ok(result) }
            },
          }),
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
  listRows = []
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

test('3.42 list rows: pull validates each list and reads tombstones as null', async () => {
  const cloud = await load()
  expect(await cloud.pullListRows('user-1')).toEqual({})
  listRows = [
    { list_id: 'a', deleted: false, data: JSON.parse(serializeExport({ ...DEFAULT_USER_STATE, lists: { a: list('a', ['x']) } })) },
    { list_id: 'b', deleted: true, data: {} },
  ]
  const rows = await cloud.pullListRows('user-1')
  expect(calls.table).toEqual(['lists'])
  expect(calls.eq).toEqual(['user-1'])
  expect(rows.a?.ownedIds).toEqual(['x'])
  expect(rows.b).toBeNull()
  listRows = [{ list_id: 'c', deleted: false, data: { app: 'something-else' } }]
  await expect(cloud.pullListRows('user-1')).rejects.toThrow('could not be read')
})

test('3.42 list rows: push upserts one row per list, null as a tombstone, and skips an empty batch', async () => {
  const cloud = await load()
  await cloud.pushListRows('user-1', {})
  expect(calls.upsert).toBeUndefined()
  await cloud.pushListRows('user-1', { a: list('a', ['x']), gone: null })
  const [value, opts] = calls.upsert as [
    { user_id: string; list_id: string; deleted: boolean; data: { app?: string; state?: { lists: Record<string, PokemonList> } } }[],
    unknown,
  ]
  expect(opts).toEqual({ onConflict: 'user_id,list_id' })
  expect(value.map((r) => [r.user_id, r.list_id, r.deleted])).toEqual([
    ['user-1', 'a', false],
    ['user-1', 'gone', true],
  ])
  expect(value[0].data.app).toBe('living-dex')
  expect(value[0].data.state?.lists.a.ownedIds).toEqual(['x'])
  expect(value[1].data).toEqual({})
})
