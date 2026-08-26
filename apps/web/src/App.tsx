import { BrowserRouter } from 'react-router'
import AppRoutes from './AppRoutes'
import { UserStateProvider } from './state/UserStateContext'

function App() {
  return (
    <UserStateProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </BrowserRouter>
    </UserStateProvider>
  )
}

export default App
