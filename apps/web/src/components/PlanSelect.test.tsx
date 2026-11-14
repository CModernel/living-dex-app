import type { TierSlugSets } from '@living-dex/business-logic'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import PlanSelect from './PlanSelect'

const set = (...s: string[]) => new Set(s)
const sets: TierSlugSets = {
  'living-form-full': set('a', 'b', 'c', 'g'),
  'living-form': set('a', 'b', 'c'),
  'living-lite': set('a', 'b'),
  'final-form-full': set('c'),
  'final-form': set('c'),
}

const optionTexts = () => within(screen.getByRole('combobox', { name: 'Plan' })).getAllByRole('option').map((o) => o.textContent)

test('lists only the tier itself and bigger tiers containing it; undecided starts on "Plan for a bigger goal…"', () => {
  const onPlan = vi.fn()
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided={false} onPlan={onPlan} />)
  // Living Lite does not contain c, so it is never offered (the floette case in real data).
  expect(optionTexts()).toEqual([
    'Plan for a bigger goal…',
    'Final Form (same as tier)',
    'Living Form Full (+3 slots · Recommended)',
    'Living Form (+2 slots)',
  ])
  expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('')
  fireEvent.change(screen.getByRole('combobox', { name: 'Plan' }), { target: { value: 'living-form' } })
  expect(onPlan).toHaveBeenCalledWith('living-form')
})

test('decided: shows the current plan, no placeholder, previous plan first as "Keep"', () => {
  render(<PlanSelect sets={sets} tier="living-lite" layoutTier="living-form-full" decided previousPlan="living-form-full" onPlan={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('living-form-full')
  expect(optionTexts()).toEqual(['Living Lite (same as tier)', 'Keep Living Form Full (+2 slots)', 'Living Form (+1 slots)'])
  expect(screen.queryByRole('region', { name: 'Plan your boxes' })).not.toBeInTheDocument()
})

test('the (?) explains why to plan', () => {
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided={false} onPlan={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Why plan your boxes?' }))
  expect(screen.getByText(/re-sort your boxes/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument()
})

test('a decided plan is tinted soft green; undecided stays amber (3.49)', () => {
  const { rerender } = render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided onPlan={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Plan' }).className).toContain('emerald')
  rerender(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided={false} onPlan={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Plan' }).className).toContain('amber')
})

test('undecided shows the banner: message, the dropdown and "Not now" (= same as tier) (3.60)', () => {
  const onPlan = vi.fn()
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided={false} onPlan={onPlan} />)
  const banner = screen.getByRole('region', { name: 'Plan your boxes' })
  expect(banner).toHaveTextContent('Planning to grow beyond Final Form? Reserve the slots now.')
  expect(within(banner).getByRole('combobox', { name: 'Plan' })).toBeInTheDocument()
  fireEvent.click(within(banner).getByRole('button', { name: 'Not now' }))
  expect(onPlan).toHaveBeenCalledWith('final-form')
})

test('decided has no banner and no "Not now" (3.60)', () => {
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" decided onPlan={() => {}} />)
  expect(screen.queryByRole('region', { name: 'Plan your boxes' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument()
})
