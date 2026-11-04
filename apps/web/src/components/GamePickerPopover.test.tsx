import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import GamePickerPopover, { type GamePickerOption } from './GamePickerPopover'

const options: GamePickerOption[] = [
  { id: 'red', name: 'Red', checked: true },
  { id: 'gold', name: 'Gold', note: 'conditional', checked: false },
]

// The popover is anchored to a real element, like the Owned-cell button it's opened from.
function Harness({
  onToggle = () => {},
  onClose = () => {},
  items = options,
  emptyMessage = 'Nothing here',
}: {
  onToggle?: (id: string) => void
  onClose?: () => void
  items?: GamePickerOption[]
  emptyMessage?: string
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <button ref={setAnchor}>Open</button>
      <p>Elsewhere</p>
      {anchor && (
        <GamePickerPopover
          anchor={anchor}
          title="Obtained from — Alpha"
          options={items}
          emptyMessage={emptyMessage}
          onToggle={onToggle}
          onClose={onClose}
        />
      )}
    </>
  )
}

test('lists each game with its checked state and note', async () => {
  render(<Harness />)
  const dialog = await screen.findByRole('dialog', { name: 'Obtained from — Alpha' })
  expect(dialog).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Red' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Gold (conditional)' })).not.toBeChecked()
})

test('ticking a game reports its id', async () => {
  const onToggle = vi.fn()
  render(<Harness onToggle={onToggle} />)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Gold (conditional)' }))
  expect(onToggle).toHaveBeenCalledWith('gold')
})

test('shows the empty message when there are no games', async () => {
  render(<Harness items={[]} emptyMessage="No availability data" />)
  expect(await screen.findByText('No availability data')).toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
})

test('moves focus to the first checkbox once it is positioned', async () => {
  render(<Harness />)
  await screen.findByRole('dialog')
  expect(screen.getByRole('checkbox', { name: 'Red' })).toHaveFocus()
})

test('Escape closes it and returns focus to the anchor', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await screen.findByRole('dialog')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
})

test('a press outside closes it, but one inside or on the anchor does not', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  await screen.findByRole('dialog')

  fireEvent.pointerDown(screen.getByRole('checkbox', { name: 'Red' }))
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Open' }))
  expect(onClose).not.toHaveBeenCalled()

  fireEvent.pointerDown(screen.getByText('Elsewhere'))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('page scroll and resize close it, but scrolling its own list does not', async () => {
  const onClose = vi.fn()
  render(<Harness onClose={onClose} />)
  const dialog = await screen.findByRole('dialog')

  fireEvent.scroll(dialog)
  expect(onClose).not.toHaveBeenCalled()

  fireEvent.scroll(document)
  expect(onClose).toHaveBeenCalledTimes(1)

  fireEvent(window, new Event('resize'))
  expect(onClose).toHaveBeenCalledTimes(2)
})
