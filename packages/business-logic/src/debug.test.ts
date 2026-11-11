import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearOwned, markOwned } from './debug.js'
import type { PokemonList } from './types.js'

const list = (ownedIds: string[], ownedGames: Record<string, string[]> = {}) =>
  ({ id: 'l', name: 'L', ownedIds, ownedGames }) as unknown as PokemonList

test('markOwned adds slugs without duplicates and keeps tags', () => {
  const next = markOwned(list(['a'], { a: ['red'] }), ['a', 'b', 'b', 'c'])
  assert.deepEqual(next.ownedIds, ['a', 'b', 'c'])
  assert.deepEqual(next.ownedGames, { a: ['red'] })
})

test('markOwned is idempotent and does not mutate', () => {
  const original = list(['a'])
  const once = markOwned(original, ['b'])
  assert.deepEqual(markOwned(once, ['b']).ownedIds, ['a', 'b'])
  assert.deepEqual(original.ownedIds, ['a'])
})

test('clearOwned empties ownership and tags but keeps the rest of the list', () => {
  const next = clearOwned(list(['a', 'b'], { a: ['red'] }))
  assert.deepEqual(next.ownedIds, [])
  assert.deepEqual(next.ownedGames, {})
  assert.equal(next.name, 'L')
})
