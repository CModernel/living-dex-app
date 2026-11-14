import { clearDatasetCache, type PokemonDataset, type PokemonEntry } from '@living-dex/business-logic'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { seedState, testList } from '../test/seed'
import { UserStateProvider } from '../state/UserStateContext'
import DashboardPage from './DashboardPage'

const entry = (slug: string, name: string, extra: Partial<PokemonEntry>): PokemonEntry =>
  ({
    slug,
    pokeapiSlug: slug,
    csvKeyword: slug,
    name,
    species: name,
    dex: '0001',
    types: ['grass'],
    generation: 1,
    regionalDex: {},
    sprites: { id: '1', hasFemale: false, hasShinyFemale: false },
    evolutionStage: 'final',
    isAlternateForm: false,
    isGenderVariant: false,
    isRegionalForm: false,
    region: null,
    hasStatOrTypeDifference: false,
    sortIndex: 1,
    ...extra,
  }) as PokemonEntry

const dataset: PokemonDataset = {
  count: 2,
  sprite: { baseUrl: '', variants: { front_default: '', front_shiny: 'shiny/', front_female: '', front_shiny_female: '' } },
  pokemon: {
    bulbasaur: entry('bulbasaur', 'Bulbasaur', { types: ['grass', 'poison'] }),
    charizard: entry('charizard', 'Charizard', { types: ['fire', 'flying'], generation: 2 }),
  },
} as PokemonDataset

let originalFetch: typeof fetch
beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
  window.localStorage.clear()
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => dataset }) as Response)
})
afterEach(() => {
  global.fetch = originalFetch
  clearDatasetCache()
  window.localStorage.clear()
})

const renderDashboard = () =>
  render(
    <UserStateProvider>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </UserStateProvider>,
  )

test('with no list it offers to create the first one (3.64)', async () => {
  renderDashboard()
  expect(await screen.findByRole('button', { name: 'Create your first list' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
})

test('shows totals, the list card, the origin donut and the type/generation/form bars (3.64)', async () => {
  seedState([testList('one', 'My Living Dex', { ownedIds: ['bulbasaur', 'charizard'], ownedGames: { bulbasaur: ['red'] } })])
  renderDashboard()
  expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getAllByText('2 / 2').length).toBeGreaterThan(0)) // owned across all lists
  expect(screen.getByRole('button', { name: 'Open My Living Dex' })).toBeInTheDocument()

  const origin = screen.getByRole('region', { name: 'Where they come from' })
  expect(within(origin).getByText('Red')).toBeInTheDocument()
  expect(within(origin).getByText('No game tagged')).toBeInTheDocument() // charizard has no tag
  expect(within(origin).getByRole('img', { name: 'Owned Pokémon by game of origin' })).toBeInTheDocument()

  const byType = screen.getByRole('list', { name: 'Owned by type' })
  expect(within(byType).getByText('fire')).toBeInTheDocument()
  expect(within(screen.getByRole('list', { name: 'Owned by generation' })).getByText('Gen 2')).toBeInTheDocument()
  expect(within(screen.getByRole('list', { name: 'Owned by form' })).getByText('Regional forms')).toBeInTheDocument()
})
