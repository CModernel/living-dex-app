import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog'

function setup(danger: boolean) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmDialog title="Delete it?" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} danger={danger} icon="🗑️">
      Body text
    </ConfirmDialog>,
  )
  return { onConfirm, onCancel }
}

test('shows the title, body and confirm label in a named dialog', () => {
  setup(true)
  expect(screen.getByRole('dialog', { name: 'Delete it?' })).toBeInTheDocument()
  expect(screen.getByText('Body text')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
})

test('confirm calls onConfirm and Cancel calls onCancel', () => {
  const { onConfirm, onCancel } = setup(false)
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})

test('Escape cancels without confirming', () => {
  const { onConfirm, onCancel } = setup(true)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onConfirm).not.toHaveBeenCalled()
})

test('a danger dialog focuses Cancel first and uses the danger button; a normal one focuses confirm', () => {
  const view = render(
    <ConfirmDialog title="A" confirmLabel="Go" onConfirm={() => {}} onCancel={() => {}} danger>
      x
    </ConfirmDialog>,
  )
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn-danger')
  view.unmount()
  render(
    <ConfirmDialog title="B" confirmLabel="Go" onConfirm={() => {}} onCancel={() => {}}>
      x
    </ConfirmDialog>,
  )
  expect(screen.getByRole('button', { name: 'Go' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('btn-primary')
})

test('confirmDisabled keeps the confirm button off (3.44)', () => {
  const onConfirm = vi.fn()
  render(
    <ConfirmDialog title="C" confirmLabel="Go" onConfirm={onConfirm} onCancel={() => {}} confirmDisabled>
      x
    </ConfirmDialog>,
  )
  const go = screen.getByRole('button', { name: 'Go' })
  expect(go).toBeDisabled()
  fireEvent.click(go)
  expect(onConfirm).not.toHaveBeenCalled()
})
