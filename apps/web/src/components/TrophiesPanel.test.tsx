import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Trophy } from '@living-dex/business-logic'
import { expect, test } from 'vitest'
import Medal from './Medal'
import TrophiesPanel from './TrophiesPanel'

const base = { description: 'd', progress: { owned: 3, total: 10 } }
const trophies: Trophy[] = [
  { ...base, id: 'pct-living-lite-25', kind: 'milestone', name: 'Living Lite 25%', earned: true, rank: 3, tierId: 'living-lite', tierName: 'Living Lite', milestone: 25 },
  { ...base, id: 'pct-final-form-25', kind: 'milestone', name: 'Final Form 25%', earned: true, rank: 1, tierId: 'final-form', tierName: 'Final Form', milestone: 25 },
  { ...base, id: 'pct-final-form-50', kind: 'milestone', name: 'Final Form 50%', earned: false, rank: 1, tierId: 'final-form', tierName: 'Final Form', milestone: 50 },
  { ...base, id: 'gen-1', kind: 'generation', name: 'Generation 1', earned: false, rank: 0, generation: 1 },
  { ...base, id: 'regional-forms', kind: 'regional', name: 'Regional forms', earned: true, rank: 2 },
]

test('counter and only earned medals, highest rank first', () => {
  render(<TrophiesPanel trophies={trophies} />)
  expect(screen.getByRole('heading', { name: 'Trophies 3/5' })).toBeInTheDocument()
  const medals = screen.getAllByRole('img')
  expect(medals.map((m) => m.getAttribute('aria-label'))).toEqual([
    'Living Lite 25% (earned)',
    'Regional forms (earned)',
    'Final Form 25% (earned)',
  ])
})

test('shows a hint when nothing is earned', () => {
  render(<TrophiesPanel trophies={trophies.map((t) => ({ ...t, earned: false }))} />)
  expect(screen.getByText(/No medals yet/)).toBeInTheDocument()
  expect(screen.queryAllByRole('img')).toHaveLength(0)
})

test('View all opens the trophy case with locked medals and progress, and closes', () => {
  render(<TrophiesPanel trophies={trophies} />)
  fireEvent.click(screen.getByRole('button', { name: 'View all' }))
  const dialog = screen.getByRole('dialog', { name: 'Trophy case' })
  expect(within(dialog).getByRole('region', { name: 'Final Form' })).toBeInTheDocument()
  expect(within(dialog).getByRole('region', { name: 'Generations' })).toBeInTheDocument()
  expect(within(dialog).getByRole('region', { name: 'Regional forms' })).toBeInTheDocument()
  expect(within(dialog).getByRole('img', { name: 'Generation 1 (locked, 3/10)' })).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('medal colour follows rank and locked medals are grey', () => {
  const { rerender } = render(<Medal trophy={trophies[0]} />)
  expect(screen.getByRole('img')).toHaveAttribute('data-rank', '3')
  rerender(<Medal trophy={{ ...trophies[0], earned: false }} />)
  expect(screen.getByRole('img')).toHaveAttribute('data-rank', '0')
})

test('generation medal shows a roman numeral', () => {
  render(<Medal trophy={{ ...trophies[3], earned: true, rank: 2, generation: 9 }} />)
  expect(screen.getByRole('img').textContent).toContain('IX')
})

test('trophy case rows show each tier with its progress percentage', () => {
  render(<TrophiesPanel trophies={trophies} />)
  fireEvent.click(screen.getByRole('button', { name: 'View all' }))
  const row = within(screen.getByRole('dialog')).getByRole('region', { name: 'Final Form' })
  expect(within(row).getAllByRole('img')).toHaveLength(2)
  expect(within(row).getByText('30%')).toBeInTheDocument()
  expect(screen.getByRole('dialog').parentElement).toHaveClass('backdrop-blur-sm')
})

test('explains that every list counts, only when there are several (3.30)', () => {
  const { rerender } = render(<TrophiesPanel trophies={trophies} listCount={1} />)
  expect(screen.queryByText(/Counts every list/)).not.toBeInTheDocument()
  rerender(<TrophiesPanel trophies={trophies} listCount={3} />)
  expect(screen.getByText('Counts every list (3).')).toBeInTheDocument()
})
