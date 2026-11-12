import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeLists } from './sync.js'
import { DEFAULT_LIST_FILTER, type PokemonList } from './types.js'

const list = (id: string, extra: Partial<PokemonList> = {}): PokemonList => ({
  id,
  name: id,
  createdAt: '2026-01-01T00:00:00.000Z',
  dataVersion: 'v1',
  variant: 'normal',
  filter: DEFAULT_LIST_FILTER,
  ownedIds: [],
  ...extra,
})

test('owned Pokémon and game tags of the same list are combined, never dropped', () => {
  const local = { a: list('a', { ownedIds: ['x', 'y'], ownedGames: { x: ['scarlet'] } }) }
  const remote = [list('a', { ownedIds: ['y', 'z'], ownedGames: { x: ['red'], z: ['gold'] } })]
  const merged = mergeLists(local, remote)
  assert.deepEqual([...merged.a.ownedIds].sort(), ['x', 'y', 'z'])
  assert.deepEqual(merged.a.ownedGames, { x: ['red', 'scarlet'], z: ['gold'] })
})

test("this device's name, tiers and settings win for a list on both sides", () => {
  const local = { a: list('a', { name: 'Mine', tier: 'final-form', settings: { viewMode: 'grid' } }) }
  const remote = [list('a', { name: 'Old name', tier: 'living-form', settings: { viewMode: 'table' } })]
  assert.deepEqual(mergeLists(local, remote).a, { ...local.a })
})

test('lists on one side only are kept', () => {
  const merged = mergeLists({ a: list('a') }, [list('b', { ownedIds: ['q'] })])
  assert.deepEqual(Object.keys(merged).sort(), ['a', 'b'])
  assert.deepEqual(merged.b.ownedIds, ['q'])
})

test('merging again changes nothing (idempotent) and the input is not mutated', () => {
  const local = { a: list('a', { ownedIds: ['x'] }) }
  const remote = [list('a', { ownedIds: ['y'] }), list('b')]
  const once = mergeLists(local, remote)
  const twice = mergeLists(once, remote)
  assert.deepEqual(twice, once)
  assert.deepEqual(local.a.ownedIds, ['x'])
})

test('a tagged slug is always owned (3.7b invariant)', () => {
  const merged = mergeLists({ a: list('a') }, [list('a', { ownedIds: [], ownedGames: { z: ['red'] } })])
  assert.ok(merged.a.ownedIds.includes('z'))
})
