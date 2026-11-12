import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { createUserStateStorage, type StorageAdapter } from './storage.js'
import { DEFAULT_USER_STATE, type UserState } from './types.js'

function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, string>()
  return {
    async getItem(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async setItem(key, value) {
      store.set(key, value)
    },
  }
}

test('getUserState returns DEFAULT_USER_STATE when nothing stored', async () => {
  const { getUserState } = createUserStateStorage(createMemoryAdapter())
  assert.deepEqual(await getUserState(), DEFAULT_USER_STATE)
})

test('setUserState then getUserState round-trips the state', async () => {
  const { getUserState, setUserState } = createUserStateStorage(createMemoryAdapter())
  const state: UserState = {
    ...DEFAULT_USER_STATE,
    activeListId: 'abc123',
  }

  await setUserState(state)
  assert.deepEqual(await getUserState(), state)
})

test('getUserState falls back to DEFAULT_USER_STATE on corrupt stored JSON', async () => {
  const adapter = createMemoryAdapter()
  await adapter.setItem('living-dex:user-state', 'not valid json')
  const { getUserState } = createUserStateStorage(adapter)

  assert.deepEqual(await getUserState(), DEFAULT_USER_STATE)
})

test('getUserState falls back to DEFAULT_USER_STATE when the adapter throws', async () => {
  const adapter: StorageAdapter = {
    async getItem() {
      throw new Error('boom')
    },
    async setItem() {},
  }
  const { getUserState } = createUserStateStorage(adapter)

  assert.deepEqual(await getUserState(), DEFAULT_USER_STATE)
})

test('setUserState swallows adapter errors instead of throwing', async () => {
  const adapter: StorageAdapter = {
    async getItem() {
      return null
    },
    async setItem() {
      throw new Error('boom')
    },
  }
  const { setUserState } = createUserStateStorage(adapter)

  await assert.doesNotReject(() => setUserState(DEFAULT_USER_STATE))
})

test('getUserState reconciles a legacy stored state with the current default columns', async () => {
  const adapter = createMemoryAdapter()
  await adapter.setItem(
    'living-dex:user-state',
    JSON.stringify({
      lists: {},
      activeListId: null,
      preferences: {
        visibleColumns: ['dex'],
        columnOrder: ['sprite', 'name', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned'],
        compactMode: false,
      },
    }),
  )
  const { getUserState } = createUserStateStorage(adapter)
  const loaded = await getUserState()

  assert.deepEqual(loaded.preferences.columnOrder, [
    'sprite', 'name', 'species', 'types', 'box', 'slot', 'position', 'dex', 'generation', 'region', 'availability', 'evolutionStage', 'owned',
  ])
  // Types predates hiding, so a legacy state keeps it visible.
  assert.deepEqual(loaded.preferences.visibleColumns, ['dex', 'types'])
  assert.deepEqual(loaded.preferences.columnSizing, {})
})

test('loading migrates legacy user-level view settings onto the lists (3.36)', async () => {
  const store = new Map<string, string>()
  const adapter = { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v) }
  const list = { id: '1', name: 'L', createdAt: 'x', dataVersion: 'v1', variant: 'normal', filter: {}, ownedIds: ['a'] }
  store.set('living-dex:user-state', JSON.stringify({ lists: { '1': list }, activeListId: '1', preferences: { viewMode: 'grid', excludedGameIds: ['red'] } }))
  const state = await createUserStateStorage(adapter).getUserState()
  assert.deepEqual(state.lists['1'].settings, { viewMode: 'grid', excludedGameIds: ['red'] })
  assert.deepEqual(state.lists['1'].ownedIds, ['a'])
  assert.ok(!('viewMode' in state.preferences))
})
