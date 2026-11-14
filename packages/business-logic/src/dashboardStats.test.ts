import assert from 'node:assert/strict'
import { test } from 'node:test'
import { statsByForm, statsByGame, statsByGeneration, statsByType } from './dashboardStats.js'
import type { PokemonEntry } from './data.js'
import type { PokemonList } from './types.js'

const mon = (slug: string, extra: Partial<PokemonEntry>) =>
  ({ slug, types: ['normal'], generation: 1, isRegionalForm: false, isGenderVariant: false, isAlternateForm: false, evolutionStage: 'final', ...extra }) as PokemonEntry

const entries = [
  mon('a', { types: ['fire', 'flying'], generation: 1 }),
  mon('b', { types: ['fire'], generation: 2, evolutionStage: 'pre' }),
  mon('c', { types: ['water'], generation: 2, isRegionalForm: true, isAlternateForm: true }),
  mon('d', { types: ['water'], generation: 3, isGenderVariant: true }),
]
const owned = new Set(['a', 'c'])

test('statsByType counts dual types for both and sorts by owned', () => {
  const rows = statsByType(entries, owned)
  assert.deepEqual(rows.map((r) => [r.key, r.owned, r.total]), [
    ['fire', 1, 2],
    ['water', 1, 2],
    ['flying', 1, 1],
  ])
})

test('statsByGeneration is in generation order with "Gen N" labels', () => {
  assert.deepEqual(statsByGeneration(entries, owned).map((r) => [r.label, r.owned, r.total]), [
    ['Gen 1', 1, 1],
    ['Gen 2', 1, 2],
    ['Gen 3', 0, 1],
  ])
})

test('statsByForm slices regional, final, gender and the other alternates', () => {
  assert.deepEqual(statsByForm(entries, owned).map((r) => [r.key, r.owned, r.total]), [
    ['regional', 1, 1],
    ['final', 2, 3],
    ['gender', 0, 1],
    ['alternate', 0, 0],
  ])
})

const list = (id: string, ownedIds: string[], ownedGames?: Record<string, string[]>) =>
  ({ id, name: id, createdAt: '', variant: 'normal', filter: {}, ownedIds, ownedGames }) as unknown as PokemonList

test('statsByGame counts tags across lists, multi-tag for each game, untagged apart', () => {
  const shares = statsByGame([list('1', ['a', 'b', 'c'], { a: ['red', 'blue'], b: ['red'] }), list('2', ['a', 'z'], { a: ['red'] })])
  assert.deepEqual(shares.map((s) => [s.gameId, s.count]), [
    [null, 2], // c and z have no tag (ties sort by label: "No game tagged" < "Red")
    ['red', 2], // a (counted once even though two lists tag it) + b
    ['blue', 1],
  ])
  assert.equal(shares[1].label, 'Red')
})
