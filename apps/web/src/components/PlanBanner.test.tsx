import type { TierSlugSets } from '@living-dex/business-logic'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import PlanBanner from './PlanBanner'

const set = (...s: string[]) => new Set(s)
const sets: TierSlugSets = {
  'living-form-full': set('a', 'b', 'c', 'g'),
  'living-form': set('a', 'b', 'c'),
  'living-lite': set('a', 'b'),
  'final-form-full': set('c'),
  'final-form': set('c'),
}

test('shows the message, a "Plan for bigger goal" button and "Not now" (= same as tier) (3.60, 3.66)', () => {
  const onPlan = vi.fn()
  render(<PlanBanner sets={sets} tier="final-form" onPlan={onPlan} />)
  const banner = screen.getByRole('region', { name: 'Plan your boxes' })
  expect(banner).toHaveTextContent('Planning to grow beyond Final Form? Reserve the slots now.')
  fireEvent.click(within(banner).getByRole('button', { name: 'Not now' }))
  expect(onPlan).toHaveBeenCalledWith('final-form')
})

test('the button opens the goals (only bigger tiers containing the tier) and choosing one decides the plan', () => {
  const onPlan = vi.fn()
  render(<PlanBanner sets={sets} tier="final-form" onPlan={onPlan} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Plan for bigger goal/ }))
  const popover = screen.getByRole('dialog', { name: 'Choose a bigger goal' })
  // Living Lite does not contain c, so it is never offered.
  expect(within(popover).getAllByRole('button').map((b) => b.textContent)).toEqual([
    'Living Form Full+3 slots · Recommended',
    'Living Form+2 slots',
  ])
  fireEvent.click(within(popover).getByRole('button', { name: /Living Form Full/ }))
  expect(onPlan).toHaveBeenCalledWith('living-form-full')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('Escape closes the goals and the (i) explains why to plan', () => {
  render(<PlanBanner sets={sets} tier="final-form" onPlan={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Plan for bigger goal/ }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Why plan your boxes?' }))
  expect(screen.getByText(/re-sort your boxes/)).toBeInTheDocument()
})
