import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { DEFAULT_LIST_FILTER, DEFAULT_USER_STATE, serializeExport, type PokemonList } from '@living-dex/business-logic'
import { UserStateProvider } from '../state/UserStateContext'
import ListsPage from './ListsPage'
import SettingsPage from './SettingsPage'

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

const imported: PokemonList = {
  id: 'from-file',
  name: 'Backup',
  createdAt: '2026-01-01T00:00:00.000Z',
  dataVersion: 'v1',
  variant: 'normal',
  filter: DEFAULT_LIST_FILTER,
  ownedIds: ['a', 'b', 'c'],
}

// Integration across two pages sharing one provider: Settings import feeds the Lists page.
test('an imported collection shows up in Lists with its owned count and can be made active', async () => {
  render(
    <UserStateProvider>
      <SettingsPage />
      <ListsPage />
    </UserStateProvider>,
  )

  const file = new File([serializeExport({ ...DEFAULT_USER_STATE, lists: { 'from-file': imported } })], 'b.json')
  fireEvent.change(screen.getByLabelText(/import file/i), { target: { files: [file] } })

  expect(await screen.findByText('Backup')).toBeInTheDocument()
  expect(screen.getByText('3 owned')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Backup'))
  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    expect(stored.lists[stored.activeListId].name).toBe('Backup')
  })
})
