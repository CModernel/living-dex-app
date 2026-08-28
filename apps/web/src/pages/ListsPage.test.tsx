import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import ListsPage from './ListsPage'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

function renderListsPage() {
  return render(
    <UserStateProvider>
      <ListsPage />
    </UserStateProvider>,
  )
}

// Opens the create-list dialog, fills the name, and submits — the "+" button's accessible
// name is "Create new list" (from its aria-label) so it never collides with the dialog's
// own "Create" submit button, matched with an anchored regex for the same reason.
function createListViaDialog(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /create new list/i }))
  fireEvent.change(screen.getByLabelText(/new list name/i), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
}

test('shows an empty-state prompt when there are no lists yet', () => {
  renderListsPage()

  expect(screen.getByText(/don't have any lists yet/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
})

test('the create dialog is closed until the "+" button is clicked', () => {
  renderListsPage()

  expect(screen.queryByLabelText(/new list name/i)).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /create new list/i }))
  expect(screen.getByLabelText(/new list name/i)).toBeInTheDocument()
})

test('creating a list shows it, marks it active, and closes the dialog', async () => {
  renderListsPage()

  // UserStateProvider hydrates from storage asynchronously; mutating before that resolves
  // can get silently clobbered back to defaults once it does — even a single create, not
  // just consecutive ones (see 3.5's useDarkMode.test.ts for the same guard, and TODO.md
  // for why this is left as-is for now).
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  createListViaDialog('Shinies')

  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())
  // Query and assert in the same statement — see HomePage.test.tsx for why (TanStack's own
  // row rendering isn't at play here, but a re-render on state change can still replace nodes).
  expect(screen.getByText('Shinies').closest('li')).toHaveClass('bg-brand/15')
  expect(screen.queryByLabelText(/new list name/i)).not.toBeInTheDocument()
})

test('clicking a different list switches which one is marked active', async () => {
  renderListsPage()

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  createListViaDialog('First')
  await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument())

  createListViaDialog('Second')
  await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument())

  // Second is active right after creation; First is not.
  await waitFor(() => expect(screen.getByText('Second').closest('li')).toHaveClass('bg-brand/15'))
  expect(screen.getByText('First').closest('li')).not.toHaveClass('bg-brand/15')

  fireEvent.click(screen.getByText('First'))

  await waitFor(() => expect(screen.getByText('First').closest('li')).toHaveClass('bg-brand/15'))
  expect(screen.getByText('Second').closest('li')).not.toHaveClass('bg-brand/15')
})

test('deleting a list removes it after confirming', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  renderListsPage()

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  createListViaDialog('Shinies')
  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /delete shinies/i }))

  expect(confirmSpy).toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByText('Shinies')).not.toBeInTheDocument())
  expect(screen.getByText(/don't have any lists yet/i)).toBeInTheDocument()

  confirmSpy.mockRestore()
})

test('declining the confirmation keeps the list', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderListsPage()

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  createListViaDialog('Shinies')
  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /delete shinies/i }))

  expect(confirmSpy).toHaveBeenCalled()
  expect(screen.getByText('Shinies')).toBeInTheDocument()

  confirmSpy.mockRestore()
})

test('clicking delete does not also switch the active list via the row handler', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderListsPage()

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  createListViaDialog('First')
  await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument())

  createListViaDialog('Second')
  await waitFor(() => expect(screen.getByText('Second').closest('li')).toHaveClass('bg-brand/15'))

  // Clicking First's delete button (declined) must not switch active to First via bubbling.
  fireEvent.click(screen.getByRole('button', { name: /delete first/i }))
  expect(screen.getByText('Second').closest('li')).toHaveClass('bg-brand/15')
  expect(screen.getByText('First').closest('li')).not.toHaveClass('bg-brand/15')

  confirmSpy.mockRestore()
})
