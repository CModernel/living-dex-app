import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Dialog from './Dialog'

test('renders a labelled modal dialog with a blurred backdrop', () => {
  const { container } = render(
    <Dialog label="Example" onClose={() => {}}>
      <p>Body</p>
    </Dialog>,
  )
  const dialog = screen.getByRole('dialog', { name: 'Example' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(container.querySelector('.dialog-backdrop')).toHaveClass('backdrop-blur-sm')
  expect(dialog).toHaveClass('dialog-card')
})

test('closes on Escape and on a backdrop click, but not on a click inside', () => {
  const onClose = vi.fn()
  const { container } = render(
    <Dialog label="Example" onClose={onClose}>
      <button>Inside</button>
    </Dialog>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Inside' }))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(container.querySelector('.dialog-backdrop')!)
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('moves focus into the dialog on open', () => {
  render(
    <Dialog label="Example" onClose={() => {}}>
      <p>Body</p>
    </Dialog>,
  )
  expect(screen.getByRole('dialog')).toHaveFocus()
})
