import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import TrophiesPanel from './TrophiesPanel'

const trophies = [
  { id: 'pct-25', name: '25% complete', description: 'd', earned: true, progress: { owned: 30, total: 100 } },
  { id: 'gen-1', name: 'Generation 1', description: 'd', earned: false, progress: { owned: 3, total: 10 } },
]

test('shows the earned counter, names and progress', () => {
  render(<TrophiesPanel trophies={trophies} />)
  expect(screen.getByRole('heading', { name: 'Trophies 1/2' })).toBeInTheDocument()
  expect(screen.getByText('30/100')).toBeInTheDocument()
  expect(screen.getByText('3/10')).toBeInTheDocument()
})

test('marks earned trophies and leaves the rest unmarked', () => {
  render(<TrophiesPanel trophies={trophies} />)
  const items = screen.getAllByRole('listitem')
  expect(items[0]).toHaveAttribute('data-earned', 'true')
  expect(items[0]).toHaveTextContent('🏆')
  expect(items[1]).toHaveAttribute('data-earned', 'false')
  expect(items[1]).not.toHaveTextContent('🏆')
})
