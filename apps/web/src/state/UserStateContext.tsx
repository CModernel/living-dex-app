import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const HydratedContext = createContext(false)

function applyAction(state: UserState, action: SetStateAction<UserState>): UserState {
  return typeof action === 'function' ? action(state) : action
}

export function UserStateProvider({ children }: { children: ReactNode }) {
  const [state, setRawState] = useState<UserState>(DEFAULT_USER_STATE)
  const [hydrated, setHydrated] = useState(false)
  const hydratedRef = useRef(false)
  // Updates made before storage has loaded. They apply immediately (so the UI reacts), but the
  // load would then overwrite them, so they are also queued and replayed on top of the loaded
  // state, in order.
  const pendingRef = useRef<SetStateAction<UserState>[]>([])

  // Identity never changes (HomePage's memoized rows depend on it).
  const setState = useCallback<Dispatch<SetStateAction<UserState>>>((action) => {
    if (!hydratedRef.current) pendingRef.current.push(action)
    setRawState(action)
  }, [])

  useEffect(() => {
    let cancelled = false
    getUserState().then((loaded) => {
      if (cancelled) return
      const next = pendingRef.current.reduce(applyAction, loaded)
      pendingRef.current = []
      hydratedRef.current = true
      setRawState(next)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Skip until the initial load resolves — otherwise this fires on mount with
    // DEFAULT_USER_STATE and can clobber whatever was already persisted.
    if (!hydrated) return
    setUserState(state)
  }, [state, hydrated])

  const value = useMemo<UserStateContextValue>(() => [state, setState], [state, setState])

  return (
    <UserStateContext.Provider value={value}>
      <HydratedContext.Provider value={hydrated}>{children}</HydratedContext.Provider>
    </UserStateContext.Provider>
  )
}

export function useUserState(): UserStateContextValue {
  const context = useContext(UserStateContext)
  if (!context) {
    throw new Error('useUserState must be used within a UserStateProvider')
  }
  return context
}

/** True once persisted state has been loaded; mount-time writers must wait for it. */
export function useIsHydrated(): boolean {
  return useContext(HydratedContext)
}
