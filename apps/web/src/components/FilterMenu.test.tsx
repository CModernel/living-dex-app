import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import FilterMenu from './FilterMenu'

test('renders a checkbox per toggle and calls toggle on click', () => {
  const toggle = vi.fn()
  render(<FilterMenu toggles={[{ id: 'finalStageOnly', label: 'Final stage only', checked: false, toggle }]} />)

  const checkbox = screen.getByRole('checkbox', { name: 'Final stage only' })
  expect(checkbox).not.toBeChecked()

  fireEvent.click(checkbox)
  expect(toggle).toHaveBeenCalledOnce()
})

test('renders a checkbox per game and wires toggle, All and None (3.8d)', () => {
  const games = { toggle: vi.fn(), selectAll: vi.fn(), selectNone: vi.fn() }
  render(
    <FilterMenu
      toggles={[]}
      games={{
        ...games,
        options: [
          { id: 'red', name: 'Red', selected: true },
          { id: 'gold', name: 'Gold', selected: false },
        ],
      }}
    />,
  )

  expect(screen.getByRole('checkbox', { name: 'Red' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Gold' })).not.toBeChecked()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Gold' }))
  expect(games.toggle).toHaveBeenCalledWith('gold')
  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  expect(games.selectAll).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', { name: 'None' }))
  expect(games.selectNone).toHaveBeenCalledOnce()
})

test('the games section is omitted when no game selection is passed', () => {
  render(<FilterMenu toggles={[]} />)
  expect(screen.queryByRole('group', { name: 'Games' })).not.toBeInTheDocument()
})
