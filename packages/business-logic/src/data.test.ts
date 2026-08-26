import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import {
  clearDatasetCache,
  fetchDataset,
  getSpriteUrl,
  type PokemonDataset,
} from './data.js'

const mockDataset: PokemonDataset = {
  count: 2,
  sprite: {
    baseUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
    variants: {
      front_default: '',
      front_shiny: 'shiny/',
      front_female: 'female/',
      front_shiny_female: 'shiny/female/',
    },
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
      regionalDex: { isle: 1 },
      sprites: { id: '1', hasFemale: false, hasShinyFemale: false },
      evolutionStage: 'pre',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 0,
    },
    pikachu: {
      slug: 'pikachu',
      pokeapiSlug: 'pikachu',
      csvKeyword: 'pikachu',
      name: 'Pikachu',
      species: 'Pikachu',
      dex: '0025',
      types: ['electric'],
      generation: 1,
      regionalDex: { alola: 25 },
      sprites: { id: '25', hasFemale: true, hasShinyFemale: true },
      evolutionStage: 'mid',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 24,
    },
  },
}

test('fetchDataset fetches and caches data', async () => {
  clearDatasetCache()
  let fetchCount = 0

  const originalFetch = global.fetch
  global.fetch = async () => {
    fetchCount++
    return {
      ok: true,
      json: async () => mockDataset,
    } as Response
  }

  try {
    const data1 = await fetchDataset()
    assert.equal(data1.count, 2)
    assert.equal(fetchCount, 1, 'fetch should be called once')

    const data2 = await fetchDataset()
    assert.equal(data2.count, 2)
    assert.equal(fetchCount, 1, 'fetch should not be called again (cached)')
  } finally {
    global.fetch = originalFetch
    clearDatasetCache()
  }
})

test('fetchDataset handles network errors', async () => {
  clearDatasetCache()

  const originalFetch = global.fetch
  global.fetch = async () => {
    return {
      ok: false,
      status: 404,
    } as Response
  }

  try {
    await assert.rejects(
      () => fetchDataset(),
      (err: Error) => err.message.includes('Failed to fetch dataset'),
    )
  } finally {
    global.fetch = originalFetch
    clearDatasetCache()
  }
})

test('getSpriteUrl returns default sprite URL', () => {
  const bulbasaur = mockDataset.pokemon.bulbasaur
  const url = getSpriteUrl(mockDataset, bulbasaur, 'default')
  assert.equal(
    url,
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
  )
})

test('getSpriteUrl returns shiny sprite URL', () => {
  const pikachu = mockDataset.pokemon.pikachu
  const url = getSpriteUrl(mockDataset, pikachu, 'shiny')
  assert.equal(
    url,
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png',
  )
})

test('getSpriteUrl returns female sprite URL when available', () => {
  const pikachu = mockDataset.pokemon.pikachu
  const url = getSpriteUrl(mockDataset, pikachu, 'female')
  assert.equal(
    url,
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/25.png',
  )
})

test('getSpriteUrl returns null for unavailable female sprite', () => {
  const bulbasaur = mockDataset.pokemon.bulbasaur
  const url = getSpriteUrl(mockDataset, bulbasaur, 'female')
  assert.equal(url, null)
})

test('getSpriteUrl returns shiny-female sprite URL when available', () => {
  const pikachu = mockDataset.pokemon.pikachu
  const url = getSpriteUrl(mockDataset, pikachu, 'shiny-female')
  assert.equal(
    url,
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/25.png',
  )
})

test('getSpriteUrl returns null for unavailable shiny-female sprite', () => {
  const bulbasaur = mockDataset.pokemon.bulbasaur
  const url = getSpriteUrl(mockDataset, bulbasaur, 'shiny-female')
  assert.equal(url, null)
})

test('getSpriteUrl defaults to default variant', () => {
  const bulbasaur = mockDataset.pokemon.bulbasaur
  const url = getSpriteUrl(mockDataset, bulbasaur)
  assert.equal(
    url,
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
  )
})
