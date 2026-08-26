import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ColumnVisibilityMenu from './ColumnVisibilityMenu'

test('renders a checkbox per column and calls toggle on click', () => {
  const toggle = vi.fn()
  render(
    <ColumnVisibilityMenu
      columns={[{ id: 'dex', label: 'Dex #', isVisible: false, toggle }]}
    />,
  )

  const checkbox = screen.getByRole('checkbox', { name: 'Dex #' })
  expect(checkbox).not.toBeChecked()

  fireEvent.click(checkbox)
  expect(toggle).toHaveBeenCalledOnce()
})
