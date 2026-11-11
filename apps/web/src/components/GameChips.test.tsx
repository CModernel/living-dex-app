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
