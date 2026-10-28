import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { getOwnedGames, toggleOwnedEntry, toggleOwnedGame } from './owned.js'
import { DEFAULT_LIST_FILTER, type PokemonList } from './types.js'

function makeList(overrides: Partial<PokemonList> = {}): PokemonList {
  return {
    id: 'list-1',
    name: 'Test',
    createdAt: '2026-10-28T00:00:00.000Z',
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: [],
    ...overrides,
  }
}

test('rule 1: clicking an unowned Pokémon owns it with no game tags', () => {
  const list = toggleOwnedEntry(makeList(), 'bulbasaur')
  assert.deepEqual(list.ownedIds, ['bulbasaur'])
  assert.deepEqual(getOwnedGames(list, 'bulbasaur'), [])
})

test('rules 2 & 3: ticking a game tags it and owns the Pokémon if it was not owned', () => {
  const fromUnowned = toggleOwnedGame(makeList(), 'bulbasaur', 'red')
  assert.deepEqual(fromUnowned.ownedIds, ['bulbasaur'])
  assert.deepEqual(getOwnedGames(fromUnowned, 'bulbasaur'), ['red'])

  const fromOwned = toggleOwnedGame(makeList({ ownedIds: ['bulbasaur'] }), 'bulbasaur', 'red')
  assert.deepEqual(fromOwned.ownedIds, ['bulbasaur'])
})

test('several games can be tagged, kept in release order', () => {
  let list = toggleOwnedGame(makeList(), 'bulbasaur', 'scarlet')
  list = toggleOwnedGame(list, 'bulbasaur', 'red')
  list = toggleOwnedGame(list, 'bulbasaur', 'sword')
  assert.deepEqual(getOwnedGames(list, 'bulbasaur'), ['red', 'sword', 'scarlet'])
})

test('rule 4: clicking an owned Pokémon unowns it and clears every game tag', () => {
  let list = toggleOwnedGame(makeList(), 'bulbasaur', 'red')
  list = toggleOwnedGame(list, 'bulbasaur', 'scarlet')
  list = toggleOwnedEntry(list, 'bulbasaur')
  assert.deepEqual(list.ownedIds, [])
  assert.deepEqual(getOwnedGames(list, 'bulbasaur'), [])
  assert.equal('bulbasaur' in (list.ownedGames ?? {}), false)
})

test('rule 5: unticking a game removes only that tag', () => {
  let list = toggleOwnedGame(makeList(), 'bulbasaur', 'red')
  list = toggleOwnedGame(list, 'bulbasaur', 'scarlet')
  list = toggleOwnedGame(list, 'bulbasaur', 'red')
  assert.deepEqual(getOwnedGames(list, 'bulbasaur'), ['scarlet'])
  assert.deepEqual(list.ownedIds, ['bulbasaur'])
})

test('rule 6: unticking the last game leaves the Pokémon owned with no tags', () => {
  let list = toggleOwnedGame(makeList(), 'bulbasaur', 'red')
  list = toggleOwnedGame(list, 'bulbasaur', 'red')
  assert.deepEqual(list.ownedIds, ['bulbasaur'])
  assert.deepEqual(getOwnedGames(list, 'bulbasaur'), [])
  assert.equal('bulbasaur' in (list.ownedGames ?? {}), false)
})

test('other entries are untouched, and the input list is never mutated', () => {
  const original = makeList({ ownedIds: ['ivysaur'], ownedGames: { ivysaur: ['red'] } })
  const snapshot = structuredClone(original)
  const afterGame = toggleOwnedGame(original, 'bulbasaur', 'gold')
  const afterEntry = toggleOwnedEntry(afterGame, 'bulbasaur')
  assert.deepEqual(original, snapshot)
  assert.deepEqual(afterEntry.ownedIds, ['ivysaur'])
  assert.deepEqual(getOwnedGames(afterEntry, 'ivysaur'), ['red'])
  // Untouched entries keep the same array identity (lets React memo skip their rows).
  assert.equal(getOwnedGames(afterGame, 'ivysaur'), original.ownedGames!.ivysaur)
})

test('works with lists saved before ownedGames existed', () => {
  const legacy = makeList({ ownedIds: ['bulbasaur'] })
  assert.deepEqual(getOwnedGames(legacy, 'bulbasaur'), [])
  assert.deepEqual(getOwnedGames(undefined, 'bulbasaur'), [])
  assert.deepEqual(toggleOwnedEntry(legacy, 'bulbasaur').ownedIds, [])
})
