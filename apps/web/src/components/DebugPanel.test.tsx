import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import DebugPanel from './DebugPanel'

vi.mock('../hooks/useDataset', () => ({
  useDataset: () => ({
    loading: false,
    error: null,
    dataset: { pokemon: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`m${i}`, { slug: `m${i}` }])) },
  }),
}))

beforeEach(() => window.localStorage.clear())

const status = () => screen.getByText(/list\(s\)/).textContent

test('marks, clears and resets through the buttons', async () => {
  render(
    <UserStateProvider>
      <DebugPanel />
    </UserStateProvider>,
  )
  expect(screen.getByRole('region', { name: 'Debug' })).toBeInTheDocument()
  await screen.findByText(/1 list\(s\), 0 owned/)
  fireEvent.click(screen.getByRole('button', { name: 'Mark first 10' }))
  expect(status()).toMatch(/10 owned/)
  fireEvent.click(screen.getByRole('button', { name: 'Mark all' }))
  expect(status()).toMatch(/12 owned/)
  fireEvent.click(screen.getByRole('button', { name: 'Clear owned' }))
  expect(status()).toMatch(/0 owned/)
  fireEvent.click(screen.getByRole('button', { name: 'Mark all' }))
  fireEvent.click(screen.getByRole('button', { name: 'Reset all data' }))
  await screen.findByText(/1 list\(s\), 0 owned/)
})
