import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { GAMES, availableGames, getAvailabilityCategory, selectedGameIds, tokenizeAvailabilityCell } from './availability.js'
import type { PokemonEntry } from './data.js'

test('single codes map to their legend category', () => {
  assert.deepEqual(tokenizeAvailabilityCell('C'), { tokens: ['C'], category: 'obtainable', footnote: false })
  assert.equal(tokenizeAvailabilityCell('ET').category, 'conditional')
  assert.equal(tokenizeAvailabilityCell('T').category, 'unobtainable')
})

test('codes are case-sensitive: Ev, EV and E differ', () => {
  assert.equal(tokenizeAvailabilityCell('Ev').category, 'unobtainable')
  assert.equal(tokenizeAvailabilityCell('EV').category, 'conditional')
  assert.equal(tokenizeAvailabilityCell('E').category, 'obtainable')
})

test('compound cells prefer 2-char codes and take the worst category', () => {
  assert.deepEqual(tokenizeAvailabilityCell('RD').tokens, ['R', 'D'])
  assert.deepEqual(tokenizeAvailabilityCell('EvET'), { tokens: ['Ev', 'ET'], category: 'unobtainable', footnote: false })
  assert.deepEqual(tokenizeAvailabilityCell('CCDA'), { tokens: ['CC', 'DA'], category: 'conditional', footnote: false })
})

test('a trailing " *" is a footnote flag, not a code', () => {
  assert.deepEqual(tokenizeAvailabilityCell('EV *'), { tokens: ['EV'], category: 'conditional', footnote: true })
})

test('empty, dash, missing and unknown cells are unobtainable without throwing', () => {
  assert.equal(tokenizeAvailabilityCell('').category, 'unobtainable')
  assert.equal(tokenizeAvailabilityCell('—').category, 'unobtainable')
  assert.equal(tokenizeAvailabilityCell(undefined).category, 'unobtainable')
  assert.equal(tokenizeAvailabilityCell('CX').category, 'unobtainable')
})

test('GAMES lists the 41 organizer games plus Pokémon GO last, with unique ids', () => {
  assert.equal(GAMES.length, 42)
  assert.equal(new Set(GAMES.map((g) => g.id)).size, 42)
  assert.deepEqual(GAMES[GAMES.length - 1], { id: 'go', name: 'Pokémon GO' })
})

test('availableGames keeps obtainable/conditional games among the given ones', () => {
  const entry = { availability: { red: 'R', blue: 'ET', gold: 'Ev', sword: 'T' } } as unknown as PokemonEntry
  assert.deepEqual(availableGames(entry, ['red', 'blue', 'gold', 'sword', 'scarlet']), ['red', 'blue'])
  assert.equal(getAvailabilityCategory(entry, 'scarlet'), 'unobtainable')
  assert.deepEqual(availableGames({} as PokemonEntry, ['red']), [])
})

test('selectedGameIds is every game minus the excluded ones, in release order', () => {
  assert.equal(selectedGameIds([]).length, 42)
  const ids = selectedGameIds(['red', 'legends-za'])
  assert.equal(ids.length, 40)
  assert.equal(ids[0], 'green')
  assert.equal(ids.includes('legends-za'), false)
})
