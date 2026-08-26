import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import AppRoutes from './AppRoutes'
import { UserStateProvider } from './state/UserStateContext'

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  // HomePage fetches the dataset on mount; routing tests only care that the right
  // page renders, so a never-resolving fetch (HomePage stays in its loading state) keeps
  // this test decoupled from the dataset's shape.
  global.fetch = vi.fn(() => new Promise(() => {}))
  window.localStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  window.localStorage.clear()
})

function renderAt(path: string) {
  render(
    <UserStateProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </UserStateProvider>,
  )
}

test('renders HomePage at /', () => {
  renderAt('/')
  expect(screen.getByText(/loading pokémon data/i)).toBeInTheDocument()
})

test('renders ListsPage at /lists', () => {
  renderAt('/lists')
  expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument()
})

test('renders SettingsPage at /settings', () => {
  renderAt('/settings')
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
})
