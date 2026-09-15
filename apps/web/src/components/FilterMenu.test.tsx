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
