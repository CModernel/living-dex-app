import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import GameChips from './GameChips'

const options = [
  { id: 'gold', name: 'Gold', checked: false },
  { id: 'red', name: 'Red', note: 'conditional', checked: true },
  { id: 'scarlet', name: 'Scarlet', checked: false },
]

test('groups games by generation in order, with the real checkbox state', () => {
  render(<GameChips options={options} onToggle={() => {}} />)
  expect(screen.getAllByText(/^Gen \d$/).map((h) => h.textContent)).toEqual(['Gen 1', 'Gen 2', 'Gen 9'])
  expect(screen.getByRole('checkbox', { name: 'Red (conditional)' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Gold' })).not.toBeChecked()
})

test('Pokémon GO gets its own "Mobile" group after the generations (3.46)', () => {
  render(<GameChips options={[...options, { id: 'go', name: 'Pokémon GO', checked: true }]} onToggle={() => {}} />)
  expect(screen.getAllByText(/^(Gen \d|Mobile)$/).map((h) => h.textContent)).toEqual(['Gen 1', 'Gen 2', 'Gen 9', 'Mobile'])
  expect(screen.getByText('GO')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Pokémon GO' })).toBeChecked()
})

test('clicking a chip toggles that game', () => {
  const onToggle = vi.fn()
  render(<GameChips options={options} onToggle={onToggle} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Scarlet' }))
  expect(onToggle).toHaveBeenCalledWith('scarlet')
})

test('each chip shows its game color', () => {
  const { container } = render(<GameChips options={options} onToggle={() => {}} />)
  const dots = [...container.querySelectorAll<HTMLElement>('span[aria-hidden="true"][style]')]
  expect(dots.map((d) => d.style.backgroundColor)).toEqual(['rgb(227, 53, 13)', 'rgb(212, 160, 23)', 'rgb(232, 71, 43)'])
})

test('a chip shows the short code; the full name is the tooltip and accessible name (3.38)', () => {
  render(<GameChips options={options} onToggle={() => {}} />)
  expect(screen.getByText('R')).toBeInTheDocument()
  expect(screen.getByText('Go')).toBeInTheDocument()
  expect(screen.getByText('Sc')).toBeInTheDocument()
  expect(screen.queryByText('Scarlet')).not.toBeInTheDocument()
  expect(screen.getByTitle('Red (conditional)')).toBeInTheDocument()
})
