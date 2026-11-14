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

test('decided: shows the current plan, previous plan first as "Keep"', () => {
  render(<PlanSelect sets={sets} tier="living-lite" layoutTier="living-form-full" previousPlan="living-form-full" onPlan={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('living-form-full')
  expect(optionTexts()).toEqual(['Living Lite (same as tier)', 'Keep Living Form Full (+2 slots)', 'Living Form (+1 slots)'])
})

test('lists only the tier itself and bigger tiers containing it; changing calls onPlan', () => {
  const onPlan = vi.fn()
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" onPlan={onPlan} />)
  // Living Lite does not contain c, so it is never offered (the floette case in real data).
  expect(optionTexts()).toEqual(['Final Form (same as tier)', 'Living Form Full (+3 slots)', 'Living Form (+2 slots)'])
  fireEvent.change(screen.getByRole('combobox', { name: 'Plan' }), { target: { value: 'living-form' } })
  expect(onPlan).toHaveBeenCalledWith('living-form')
})

test('the (?) explains why to plan', () => {
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" onPlan={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Why plan your boxes?' }))
  expect(screen.getByText(/re-sort your boxes/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Learn more' })).toBeInTheDocument()
})

test('the plan is tinted soft green (3.49)', () => {
  render(<PlanSelect sets={sets} tier="final-form" layoutTier="final-form" onPlan={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Plan' }).className).toContain('emerald')
})
