import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PokemonEntry } from './data.js'
import { ownedProgress } from './progress.js'

const entries = ['a', 'b', 'c'].map((slug) => ({ slug }) as PokemonEntry)

test('counts only owned slugs that are in the entries', () => {
  assert.deepEqual(ownedProgress(entries, new Set(['a', 'zzz'])), { owned: 1, total: 3, percent: 33 })
})

test('empty entries give 0%', () => {
  assert.deepEqual(ownedProgress([], new Set(['a'])), { owned: 0, total: 0, percent: 0 })
})

test('all owned is 100%', () => {
  assert.equal(ownedProgress(entries, new Set(['a', 'b', 'c'])).percent, 100)
})
