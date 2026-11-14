import { Route, Routes } from 'react-router'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import ListsPage from './pages/ListsPage'
import SettingsPage from './pages/SettingsPage'
import TiersPage from './pages/TiersPage'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="lists" element={<ListsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="tiers" element={<TiersPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
