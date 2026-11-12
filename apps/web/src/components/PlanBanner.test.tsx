import type { TierSlugSets } from '@living-dex/business-logic'
import { fireEvent, render, screen } from '@testing-library/react'
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

test('the popover lists only bigger tiers containing the current one and closes on Escape and on tier change', () => {
  const onPlan = vi.fn()
  const { rerender } = render(
    <PlanBanner mode="banner" sets={sets} tier="final-form" layoutTier="final-form" onPlan={onPlan} onNotNow={() => {}} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Plan for bigger goal' }))
  const names = screen.getAllByRole('button').filter((b) => /slots/.test(b.textContent ?? '')).map((b) => b.textContent)
  // Living Lite does not contain c, so it is never offered (same as the floette case in real data).
  expect(names).toEqual(['Living Form Full+3 slots · Recommended', 'Living Form+2 slots'])
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Choose a bigger goal' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Plan for bigger goal' }))
  rerender(<PlanBanner mode="banner" sets={sets} tier="living-lite" layoutTier="living-lite" onPlan={onPlan} onNotNow={() => {}} />)
  expect(screen.queryByRole('dialog', { name: 'Choose a bigger goal' })).not.toBeInTheDocument()
})

test('"Not now" and the why-plan tooltip', () => {
  const onNotNow = vi.fn()
  render(<PlanBanner mode="banner" sets={sets} tier="final-form" layoutTier="final-form" onPlan={() => {}} onNotNow={onNotNow} />)
  fireEvent.click(screen.getByRole('button', { name: 'Why plan your boxes?' }))
  expect(screen.getByText(/re-sort your boxes/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
  expect(onNotNow).toHaveBeenCalledTimes(1)
})
