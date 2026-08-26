import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useDataset } from './useDataset'

const mockDataset: PokemonDataset = {
  count: 1,
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
  },
}

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
})

afterEach(() => {
  global.fetch = originalFetch
  clearDatasetCache()
})

test('starts in a loading state, then resolves with the dataset', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)

  const { result } = renderHook(() => useDataset())

  expect(result.current.loading).toBe(true)
  expect(result.current.dataset).toBe(null)

  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.error).toBe(null)
  expect(result.current.dataset?.count).toBe(1)
})

test('resolves with an error when the fetch fails', async () => {
  global.fetch = vi.fn(async () => ({ ok: false, status: 500 }) as Response)

  const { result } = renderHook(() => useDataset())

  await waitFor(() => expect(result.current.loading).toBe(false))

  expect(result.current.dataset).toBe(null)
  expect(result.current.error).toBeInstanceOf(Error)
})
