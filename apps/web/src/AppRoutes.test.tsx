import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import AppRoutes from './AppRoutes'

test('renders HomePage at /', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: /living dex organizer/i })).toBeInTheDocument()
})

test('renders ListsPage at /lists', () => {
  render(
    <MemoryRouter initialEntries={['/lists']}>
      <AppRoutes />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument()
})

test('renders SettingsPage at /settings', () => {
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <AppRoutes />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
})
