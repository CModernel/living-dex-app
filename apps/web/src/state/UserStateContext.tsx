import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  createUserStateStorage,
  DEFAULT_USER_STATE,
  type StorageAdapter,
  type UserState,
} from '@living-dex/business-logic'

const localStorageAdapter: StorageAdapter = {
  async getItem(key) {
    return localStorage.getItem(key)
  },
  async setItem(key, value) {
    localStorage.setItem(key, value)
  },
}

const { getUserState, setUserState } = createUserStateStorage(localStorageAdapter)

type UserStateContextValue = [UserState, Dispatch<SetStateAction<UserState>>]

const UserStateContext = createContext<UserStateContextValue | null>(null)

export function UserStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(DEFAULT_USER_STATE)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    getUserState().then((loaded) => {
      setState(loaded)
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    // Skip until the initial load resolves — otherwise this fires on mount with
    // DEFAULT_USER_STATE and can clobber whatever was already persisted.
    if (!hydrated) return
    setUserState(state)
  }, [state, hydrated])

  return <UserStateContext.Provider value={[state, setState]}>{children}</UserStateContext.Provider>
}

export function useUserState(): UserStateContextValue {
  const context = useContext(UserStateContext)
  if (!context) {
    throw new Error('useUserState must be used within a UserStateProvider')
  }
  return context
}
