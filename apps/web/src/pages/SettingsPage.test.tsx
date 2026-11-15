import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { serializeExport, DEFAULT_USER_STATE, type PokemonList } from '@living-dex/business-logic'
import { UserStateProvider } from '../state/UserStateContext'
import SettingsPage from './SettingsPage'

const STORAGE_KEY = 'living-dex:user-state'

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

function renderPage() {
  return render(
    <UserStateProvider>
      <SettingsPage />
    </UserStateProvider>,
  )
}

const sampleList: PokemonList = {
  id: 'old-id',
  name: 'Dex',
  createdAt: '2026-01-01T00:00:00.000Z',
  dataVersion: 'v1',
  variant: 'normal',
  filter: { finalStageOnly: false, regionalFormsOnly: false, hideGenderVariants: false, hideInaccessible: false },
  ownedIds: ['bulbasaur'],
}

function chooseFile(content: string) {
  const input = screen.getByLabelText(/import file/i)
  fireEvent.change(input, { target: { files: [new File([content], 'backup.json', { type: 'application/json' })] } })
}

function storedLists(): PokemonList[] {
  return Object.values(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{"lists":{}}').lists)
}

test('renders the settings heading and data buttons', () => {
  renderPage()
  expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
})

test('importing a valid file adds the collection with a new id and shows a success message', async () => {
  renderPage()
  chooseFile(serializeExport({ ...DEFAULT_USER_STATE, lists: { 'old-id': sampleList } }))

  expect(await screen.findByRole('status')).toHaveTextContent('Imported 1 collection.')
  await waitFor(() => expect(storedLists()).toHaveLength(1))
  const [imported] = storedLists()
  expect(imported.name).toBe('Dex')
  expect(imported.id).not.toBe('old-id')
  expect(imported.ownedIds).toEqual(['bulbasaur'])
})

test('an invalid file shows the error and changes nothing', async () => {
  renderPage()
  chooseFile('definitely not json')

  expect(await screen.findByRole('status')).toHaveTextContent(/not valid json/i)
  expect(storedLists()).toHaveLength(0)
})

test('export downloads a JSON backup of the current state', async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_USER_STATE, lists: { 'old-id': sampleList }, activeListId: 'old-id' }),
  )
  renderPage()

  let blob: Blob | undefined
  URL.createObjectURL = vi.fn((b: Blob) => {
    blob = b
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toMatch(/^living-dex-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })

  // Hydration is async and the page has no signal for it, so retry the click until the export
  // reflects the persisted list instead of the defaults.
  await waitFor(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    const exported = JSON.parse(await blob!.text())
    expect(exported.app).toBe('living-dex')
    expect(exported.state.lists['old-id'].name).toBe('Dex')
  })
  expect(click).toHaveBeenCalled()
})

test('the About section shows the unofficial-fan-tool disclaimer', () => {
  renderPage()
  const about = screen.getByRole('region', { name: 'About' })
  expect(about).toHaveTextContent('independent, unofficial fan-made tool')
  expect(about).toHaveTextContent('Nintendo, Game Freak, Creatures Inc. or The Pokémon Company')
})

test('the About section credits the data and sprite sources (3.74)', () => {
  renderPage()
  const about = screen.getByRole('region', { name: 'About' })
  expect(about).toHaveTextContent('PokeAPI')
  expect(about).toHaveTextContent('PokeJungle')
})

test('the Install section explains offline use and how to install (3.39)', () => {
  renderPage()
  const section = screen.getByRole('region', { name: 'Install' })
  expect(section).toHaveTextContent('Living Dex works offline')
  expect(section).toHaveTextContent('Add to Home Screen')
})
