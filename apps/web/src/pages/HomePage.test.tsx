import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import HomePage from './HomePage'

const mockDataset: PokemonDataset = {
  count: 3,
  sprite: {
    baseUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
    variants: { front_default: '', front_shiny: 'shiny/', front_female: 'female/', front_shiny_female: 'shiny/female/' },
  },
  pokemon: {
    bulbasaur: {
      slug: 'bulbasaur',
      pokeapiSlug: 'bulbasaur',
      csvKeyword: 'bulbasaur',
      name: 'Bulbasaur',
      species: 'Bulbasaur',
      dex: '0001',
      types: ['grass', 'poison'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '1', hasFemale: false, hasShinyFemale: false },
      evolutionStage: 'pre',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 0,
    },
    // isGenderVariant entries are excluded by the living-form tier predicate — this
    // fixture entry should never render as a row.
    pikachuFemale: {
      slug: 'pikachu-female',
      pokeapiSlug: 'pikachu',
      csvKeyword: 'pikachu-f',
      name: 'Pikachu (female)',
      species: 'Pikachu',
      dex: '0025',
      types: ['electric'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '25', hasFemale: true, hasShinyFemale: false },
      evolutionStage: 'mid',
      isAlternateForm: false,
      isGenderVariant: true,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 1,
    },
    // Only entry with evolutionStage: 'final' — used to verify the tier selector: it's the
    // only fixture entry that survives filtering down to the "Final Form" tier.
    charizard: {
      slug: 'charizard',
      pokeapiSlug: 'charizard',
      csvKeyword: 'charizard',
      name: 'Charizard',
      species: 'Charizard',
      dex: '0006',
      types: ['fire', 'flying'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '6', hasFemale: false, hasShinyFemale: false },
      evolutionStage: 'final',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 2,
    },
  },
}

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
  window.localStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  clearDatasetCache()
  window.localStorage.clear()
})

function renderHomePage() {
  return render(
    <UserStateProvider>
      <HomePage />
    </UserStateProvider>,
  )
}

test('shows a loading state before the dataset resolves', () => {
  global.fetch = vi.fn(() => new Promise(() => {}))
  renderHomePage()
  expect(screen.getByText(/loading pokémon data/i)).toBeInTheDocument()
})

test('shows an error message when the dataset fails to load', async () => {
  global.fetch = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText(/failed to load dataset/i)).toBeInTheDocument())
})

test('renders one row per living-form entry, applying the tier predicate', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  // The gender-variant entry is filtered out by the living-form tier predicate.
  expect(screen.queryByText('Pikachu (female)')).not.toBeInTheDocument()
})

test('switching the tier selector changes which rows render', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/tier/i), { target: { value: 'final-form' } })

  // Bulbasaur (evolutionStage: 'pre') doesn't survive the Final Form predicate; Charizard
  // (evolutionStage: 'final') does.
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()
})

test('toggling the owned checkbox persists to the active list', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  const checkbox = await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  expect(checkbox).not.toBeChecked()

  fireEvent.click(checkbox)

  await waitFor(() => expect(checkbox).toBeChecked())
  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    const lists = Object.values(stored.lists ?? {}) as { ownedIds: string[] }[]
    expect(lists[0]?.ownedIds).toContain('bulbasaur')
  })
})
