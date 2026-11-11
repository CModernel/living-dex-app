import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { useDebugEnabled } from './hooks/useDebugEnabled'
import { UserStateProvider } from './state/UserStateContext'

// Dev-only debug panel (TODO 3.20): the dynamic import sits behind `import.meta.env.DEV`, which Vite
// replaces with `false` in production, so the panel's chunk is dropped from the build entirely.
const DebugPanel = import.meta.env.DEV ? lazy(() => import('./components/DebugPanel')) : null

function App() {
  const debug = useDebugEnabled()
  return (
    <UserStateProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
        {DebugPanel && debug && (
          <Suspense fallback={null}>
            <DebugPanel />
          </Suspense>
        )}
      </BrowserRouter>
    </UserStateProvider>
  )
}

export default App
