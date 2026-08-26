import { UserState, DEFAULT_USER_STATE } from './types'

const STORAGE_KEY = 'living-dex:user-state'

// Storage abstraction layer. Currently localStorage, future Supabase (TODO #4).
// Apps should use these two functions; concrete implementation swaps seamlessly.

export async function getUserState(): Promise<UserState> {
  try {
    const stored = localStorage?.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : DEFAULT_USER_STATE
  } catch {
    return DEFAULT_USER_STATE
  }
}

export async function setUserState(state: UserState): Promise<void> {
  try {
    localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    console.warn('Failed to persist user state')
  }
}
