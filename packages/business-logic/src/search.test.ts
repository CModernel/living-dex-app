import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchesSearch } from './search.js'

const venusaur = { name: 'Venusaur (Mega)', species: 'Venusaur', dex: '003' }

test('empty query matches everything', () => {
  assert.ok(matchesSearch(venusaur, ''))
  assert.ok(matchesSearch(venusaur, '   '))
})

test('matches name or species, case-insensitive, by substring', () => {
  assert.ok(matchesSearch(venusaur, 'VENU'))
  assert.ok(matchesSearch(venusaur, 'mega'))
  assert.ok(!matchesSearch(venusaur, 'char'))
})

test('a number matches the exact Dex number, with or without #, ignoring leading zeros', () => {
  assert.ok(matchesSearch(venusaur, '3'))
  assert.ok(matchesSearch(venusaur, '#003'))
  assert.ok(!matchesSearch(venusaur, '30'))
})
