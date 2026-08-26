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
