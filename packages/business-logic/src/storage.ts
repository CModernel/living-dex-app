import { migrateListSettings } from './listSettings.js'
import { reconcilePreferences } from './preferences.js'
import { UserState, DEFAULT_USER_STATE } from './types.js'

const STORAGE_KEY = 'living-dex:user-state'

// Platform-agnostic key/value contract. web/mobile each supply their own adapter
// (localStorage / AsyncStorage) — this package has no browser or React Native globals.
export type StorageAdapter = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export type UserStateStorage = {
  getUserState(): Promise<UserState>
  setUserState(state: UserState): Promise<void>
}

// Storage abstraction layer. Currently key/value (localStorage/AsyncStorage), future
// Supabase (TODO #4) — swap the adapter, callers don't change.
export function createUserStateStorage(adapter: StorageAdapter): UserStateStorage {
  async function getUserState(): Promise<UserState> {
    try {
      const stored = await adapter.getItem(STORAGE_KEY)
      if (!stored) return DEFAULT_USER_STATE
      const parsed = migrateListSettings(JSON.parse(stored) as UserState)
      return { ...parsed, preferences: reconcilePreferences(parsed.preferences) }
    } catch {
      return DEFAULT_USER_STATE
    }
  }

  async function setUserState(state: UserState): Promise<void> {
    try {
      await adapter.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      console.warn('Failed to persist user state')
    }
  }

  return { getUserState, setUserState }
}
