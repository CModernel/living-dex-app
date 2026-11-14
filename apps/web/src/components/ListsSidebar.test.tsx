import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { seedState, STORAGE_KEY, testList } from '../test/seed'
import ListsSidebar from './ListsSidebar'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

function renderSidebar() {
  seedState([testList('1', 'Alpha', { ownedIds: ['a'] }), testList('2', 'Beta', { icon: '⭐' })])
  return render(
    <UserStateProvider>
      <MemoryRouter>
        <ListsSidebar />
      </MemoryRouter>
    </UserStateProvider>,
  )
}

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)

test('rows show the name and count, with Edit/Clone/Delete inside a "⋯" menu (3.29)', async () => {
  renderSidebar()
  await screen.findByText('Alpha')
  expect(screen.getByText('1 owned')).toBeInTheDocument()
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Alpha' }))
  expect(screen.getAllByRole('menuitem').map((m) => m.getAttribute('aria-label'))).toEqual(['Edit Alpha', 'Clone Alpha', 'Delete Alpha'])
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

test('collapsing folds the sidebar to a rail, remembers it, and the rail switches lists (3.31)', async () => {
  renderSidebar()
  await screen.findByText('Alpha')
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  await waitFor(() => expect(stored().preferences.sidebarCollapsed).toBe(true))
  expect(screen.getByRole('button', { name: 'Switch to Beta' })).toHaveTextContent('⭐')
  expect(screen.getByRole('button', { name: 'Switch to Alpha' })).toHaveTextContent('A')
  fireEvent.click(screen.getByRole('button', { name: 'Switch to Beta' }))
  await waitFor(() => expect(stored().activeListId).toBe('2'))
  fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))
  await waitFor(() => expect(stored().preferences.sidebarCollapsed).toBe(false))
})

test('one "+" in the header and one in the rail, both opening the create dialog (3.61)', async () => {
  renderSidebar()
  await screen.findByText('Alpha')
  expect(screen.getAllByRole('button', { name: 'Create new list' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Create new list' }))
  expect(await screen.findByRole('dialog', { name: 'Create new list' })).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Create new list' })).toHaveLength(2)) // the header one is only hidden by CSS
})
