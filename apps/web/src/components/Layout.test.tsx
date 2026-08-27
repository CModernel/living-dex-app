import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import Layout from './Layout'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  window.localStorage.clear()
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
  window.localStorage.clear()
})

function renderLayout() {
  render(
    <UserStateProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </UserStateProvider>,
  )
}

test('renders nav links and outlet content', () => {
  renderLayout()

  expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /lists/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  expect(screen.getByText('Child content')).toBeInTheDocument()
})

test('dark mode toggle button switches the document theme class', async () => {
  renderLayout()

  const toggle = screen.getByRole('button', { name: /switch to (dark|light) mode/i })
  const wasDark = document.documentElement.classList.contains('dark')

  fireEvent.click(toggle)

  await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(!wasDark))
})
