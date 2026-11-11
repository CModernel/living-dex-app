import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { UserStateProvider } from '../state/UserStateContext'
import { seedState, testList } from '../test/seed'
import ListsPage from './ListsPage'

let originalFetch: typeof fetch

// Two plain entries (no gender variants): every Living tier is the same set, so the wizard has no
// step 2 for Living Form and creates the list straight away.
const dataset = {
  count: 2,
  sprite: { baseUrl: '', variants: {} },
  pokemon: Object.fromEntries(
    ['bulbasaur', 'venusaur'].map((slug, i) => [
      slug,
      { slug, csvKeyword: slug, name: slug, species: slug, dex: `000${i + 1}`, sortIndex: i, generation: 1,
        evolutionStage: i ? 'final' : 'pre', isAlternateForm: false, isGenderVariant: false, isRegionalForm: false },
    ]),
  ),
} as unknown as PokemonDataset

beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => dataset }) as Response)
  window.localStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  clearDatasetCache()
  window.localStorage.clear()
})

function renderListsPage() {
  return render(
    <UserStateProvider>
      <ListsPage />
    </UserStateProvider>,
  )
}

// Lists are seeded (3.19: creating one goes through the start wizard, covered by its own test below).
// The last seeded list is the active one, as if it had just been created.
function seedLists(...names: string[]) {
  const lists = names.map((name, i) => testList(`id-${i}`, name, { createdAt: `2026-01-0${i + 1}T00:00:00.000Z` }))
  seedState(lists, { activeListId: lists.at(-1)?.id ?? null })
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

test('creating a list through the start wizard shows it, marks it active, and closes the dialog', async () => {
  renderListsPage()

  fireEvent.click(screen.getByRole('button', { name: /create new list/i }))
  fireEvent.change(screen.getByLabelText(/new list name/i), { target: { value: 'Shinies' } })
  const create = screen.getByRole('button', { name: /^create$/i })
  await waitFor(() => expect(create).toBeEnabled())
  fireEvent.click(create)

  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())
  // Query and assert in the same statement — see HomePage.test.tsx for why (TanStack's own
  // row rendering isn't at play here, but a re-render on state change can still replace nodes).
  expect(screen.getByText('Shinies').closest('li')).toHaveClass('bg-brand/15')
  expect(screen.queryByLabelText(/new list name/i)).not.toBeInTheDocument()
})

test('clicking a different list switches which one is marked active', async () => {
  seedLists('First', 'Second')
  renderListsPage()
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
  seedLists('Shinies')
  renderListsPage()
  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /delete shinies/i }))

  expect(confirmSpy).toHaveBeenCalled()
  await waitFor(() => expect(screen.queryByText('Shinies')).not.toBeInTheDocument())
  expect(screen.getByText(/don't have any lists yet/i)).toBeInTheDocument()

  confirmSpy.mockRestore()
})

test('declining the confirmation keeps the list', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  seedLists('Shinies')
  renderListsPage()
  await waitFor(() => expect(screen.getByText('Shinies')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /delete shinies/i }))

  expect(confirmSpy).toHaveBeenCalled()
  expect(screen.getByText('Shinies')).toBeInTheDocument()

  confirmSpy.mockRestore()
})

test('clicking delete does not also switch the active list via the row handler', async () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  seedLists('First', 'Second')
  renderListsPage()
  await waitFor(() => expect(screen.getByText('Second').closest('li')).toHaveClass('bg-brand/15'))

  // Clicking First's delete button (declined) must not switch active to First via bubbling.
  fireEvent.click(screen.getByRole('button', { name: /delete first/i }))
  expect(screen.getByText('Second').closest('li')).toHaveClass('bg-brand/15')
  expect(screen.getByText('First').closest('li')).not.toHaveClass('bg-brand/15')

  confirmSpy.mockRestore()
})

test('edit dialog renames the list and sets an icon', async () => {
  seedLists('Dex')
  renderListsPage()
  await screen.findByText('Dex')

  fireEvent.click(screen.getByRole('button', { name: /edit dex/i }))
  fireEvent.change(screen.getByLabelText(/^list name$/i), { target: { value: 'Base Dex' } })
  fireEvent.click(screen.getByRole('button', { name: 'Icon ⭐' }))
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  expect(await screen.findByText('Base Dex')).toBeInTheDocument()
  expect(screen.getByText('⭐')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('clone button adds a "(copy)" list', async () => {
  seedLists('Dex')
  renderListsPage()
  await screen.findByText('Dex')

  fireEvent.click(screen.getByRole('button', { name: /clone dex/i }))
  expect(await screen.findByText('Dex (copy)')).toBeInTheDocument()
})

test('cancelling the edit dialog keeps the list unchanged', async () => {
  seedLists('Dex')
  renderListsPage()
  await screen.findByText('Dex')

  fireEvent.click(screen.getByRole('button', { name: /edit dex/i }))
  fireEvent.change(screen.getByLabelText(/^list name$/i), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByText('Dex')).toBeInTheDocument()
  expect(screen.queryByText('Changed')).not.toBeInTheDocument()
})
