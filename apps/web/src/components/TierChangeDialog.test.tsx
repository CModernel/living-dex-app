import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { TierSlugSets } from '@living-dex/business-logic'
import TierChangeDialog from './TierChangeDialog'

// Final Form covers 2 species; Living Form adds 3 more that the Final Form plan does not hold.
const sets = {
  'final-form': new Set(['a', 'b']),
  'living-form': new Set(['a', 'b', 'c', 'd', 'e']),
} as unknown as TierSlugSets

function setup() {
  const handlers = { onContinue: vi.fn(), onMigrate: vi.fn(), onCancel: vi.fn() }
  render(<TierChangeDialog sets={sets} to="living-form" layoutTier="final-form" {...handlers} />)
  return handlers
}

test('names both tiers and counts the Pokémon outside the plan', () => {
  setup()
  const dialog = screen.getByRole('dialog', { name: 'Change tier' })
  expect(screen.getByRole('heading', { name: 'Switch to Living Form?' })).toBeInTheDocument()
  expect(dialog).toHaveTextContent('planned for Final Form')
  expect(dialog).toHaveTextContent('Living Form adds 3 Pokémon outside that plan')
})

test('explains both options in short bullets', () => {
  setup()
  const items = screen.getAllByRole('listitem')
  expect(items).toHaveLength(2)
  expect(items[0]).toHaveTextContent('Copy to a new list: keeps this one and plans the copy for Living Form.')
  expect(items[1]).toHaveTextContent('Switch anyway: shows Living Form here.')
})

test('each button calls its own handler', () => {
  const h = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Switch anyway' }))
  fireEvent.click(screen.getByRole('button', { name: 'Copy to a new list' }))
  expect([h.onCancel, h.onContinue, h.onMigrate].map((f) => f.mock.calls.length)).toEqual([1, 1, 1])
})
