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

// ---- 3.42 three-way merge (conflict matrix) ----
import { mergeList3, sameList, sameLists, syncLists } from './sync.js'

test('mergeList3: un-marking on one device wins over the other device simply still having it', () => {
  const base = list('a', { ownedIds: ['x', 'y'] })
  const local = list('a', { ownedIds: ['x'] }) // un-marked y here
  const remote = list('a', { ownedIds: ['x', 'y'] })
  assert.deepEqual(mergeList3(base, local, remote).ownedIds, ['x'])
  assert.deepEqual(mergeList3(base, remote, local).ownedIds, ['x']) // same when the other device un-marked
})

test('mergeList3: adds on both devices are both kept, and an un-mark on one side still applies', () => {
  const base = list('a', { ownedIds: ['x'] })
  const local = list('a', { ownedIds: ['x', 'p'] })
  const remote = list('a', { ownedIds: ['q'] }) // added q, un-marked x
  assert.deepEqual([...mergeList3(base, local, remote).ownedIds].sort(), ['p', 'q'])
})

test('mergeList3: game tags follow the same rule and keep release order; a tagged entry stays owned', () => {
  const base = list('a', { ownedIds: ['x'], ownedGames: { x: ['red', 'gold'] } })
  const local = list('a', { ownedIds: ['x'], ownedGames: { x: ['red', 'gold', 'scarlet'] } })
  const remote = list('a', { ownedIds: ['x'], ownedGames: { x: ['gold'] } }) // removed red
  assert.deepEqual(mergeList3(base, local, remote).ownedGames, { x: ['gold', 'scarlet'] })
  const tagElsewhere = mergeList3(list('a'), list('a', { ownedIds: [] }), list('a', { ownedIds: ['z'], ownedGames: { z: ['go'] } }))
  assert.deepEqual(tagElsewhere.ownedIds, ['z'])
  assert.deepEqual(tagElsewhere.ownedGames, { z: ['go'] })
})

test('mergeList3: removing every tag drops the ownedGames field', () => {
  const base = list('a', { ownedIds: ['x'], ownedGames: { x: ['red'] } })
  const merged = mergeList3(base, list('a', { ownedIds: ['x'] }), base)
  assert.equal('ownedGames' in merged, false)
})

test('mergeList3: the side that renamed wins; both renamed → this device wins; icon removal propagates', () => {
  const base = list('a', { name: 'Base', icon: '⭐' })
  assert.equal(mergeList3(base, base, list('a', { name: 'Remote', icon: '⭐' })).name, 'Remote')
  assert.equal(mergeList3(base, list('a', { name: 'Local', icon: '⭐' }), list('a', { name: 'Remote', icon: '⭐' })).name, 'Local')
  assert.equal('icon' in mergeList3(base, base, list('a', { name: 'Base' })), false)
  const tiers = mergeList3(base, base, list('a', { name: 'Base', icon: '⭐', tier: 'final-form', settings: { viewMode: 'grid' } }))
  assert.equal(tiers.tier, 'final-form')
  assert.deepEqual(tiers.settings, { viewMode: 'grid' })
})

test('syncLists: first sync without a base is the union merge; everything new is pushed', () => {
  const { lists, push } = syncLists({}, { a: list('a', { ownedIds: ['x'] }) }, { a: list('a', { ownedIds: ['y'] }), b: list('b') })
  assert.deepEqual([...lists.a.ownedIds].sort(), ['x', 'y'])
  assert.ok(lists.b)
  assert.deepEqual(Object.keys(push), ['a']) // b is already in the cloud as is
})

test('syncLists: a list deleted here and untouched in the cloud is marked deleted there', () => {
  const a = list('a', { ownedIds: ['x'] })
  const { lists, push } = syncLists({ a }, {}, { a })
  assert.deepEqual(lists, {})
  assert.deepEqual(push, { a: null })
})

test('syncLists: a list deleted elsewhere and untouched here is removed here, nothing pushed', () => {
  const a = list('a', { ownedIds: ['x'] })
  const { lists, push } = syncLists({ a }, { a }, { a: null })
  assert.deepEqual(lists, {})
  assert.deepEqual(push, {})
})

test('syncLists: deleted on one device but edited on the other since the base → kept (nothing lost)', () => {
  const a = list('a', { ownedIds: ['x'] })
  const edited = list('a', { ownedIds: ['x', 'y'] })
  const keptHere = syncLists({ a }, { a: edited }, { a: null })
  assert.deepEqual(keptHere.lists.a.ownedIds, ['x', 'y'])
  assert.deepEqual(keptHere.push, { a: edited }) // resurrected in the cloud
  const keptFromCloud = syncLists({ a }, {}, { a: edited })
  assert.deepEqual(keptFromCloud.lists.a.ownedIds, ['x', 'y'])
  assert.deepEqual(keptFromCloud.push, {})
})

test('syncLists: a new list on another device arrives; a new list here is pushed; tombstones without a list stay quiet', () => {
  const { lists, push } = syncLists({}, { mine: list('mine') }, { theirs: list('theirs'), gone: null })
  assert.deepEqual(Object.keys(lists).sort(), ['mine', 'theirs'])
  assert.deepEqual(Object.keys(push), ['mine'])
})

test('syncLists: running it again on its own output changes nothing (converges)', () => {
  const base = { a: list('a', { ownedIds: ['x', 'y'] }) }
  const local = { a: list('a', { ownedIds: ['x'] }), n: list('n') }
  const remote = { a: list('a', { ownedIds: ['x', 'y', 'z'] }) }
  const first = syncLists(base, local, remote)
  const cloudAfter = { ...remote, ...first.push }
  const second = syncLists(first.lists, first.lists, cloudAfter as Record<string, PokemonList | null>)
  assert.ok(sameLists(second.lists, first.lists))
  assert.deepEqual(second.push, {})
  assert.deepEqual([...first.lists.a.ownedIds].sort(), ['x', 'z'])
})

test('sameList ignores owned order and key order, not content', () => {
  assert.ok(sameList(list('a', { ownedIds: ['x', 'y'] }), list('a', { ownedIds: ['y', 'x'] })))
  assert.ok(!sameList(list('a', { ownedIds: ['x'] }), list('a', { ownedIds: ['y'] })))
  assert.ok(!sameList(list('a'), null))
  assert.ok(sameList(null, undefined))
})
