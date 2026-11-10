import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PokemonEntry } from './data.js'
import { evaluateTrophies } from './trophies.js'

function entry(slug: string, generation: number, isRegionalForm = false): PokemonEntry {
  return { slug, generation, isRegionalForm } as PokemonEntry
}

const earned = (ids: string[], id: string) => ids.includes(id)
const earnedIds = (t: ReturnType<typeof evaluateTrophies>) => t.filter((x) => x.earned).map((x) => x.id)

test('no entries earns nothing', () => {
  assert.deepEqual(earnedIds(evaluateTrophies([], new Set())), [])
})

test('milestones trigger exactly at the threshold', () => {
  const entries = Array.from({ length: 100 }, (_, i) => entry(`p${i}`, 1))
  const own = (n: number) => new Set(entries.slice(0, n).map((e) => e.slug))
  assert.equal(earned(earnedIds(evaluateTrophies(entries, own(24))), 'pct-25'), false)
  assert.equal(earned(earnedIds(evaluateTrophies(entries, own(25))), 'pct-25'), true)
  assert.equal(earned(earnedIds(evaluateTrophies(entries, own(99))), 'pct-100'), false)
  assert.equal(earned(earnedIds(evaluateTrophies(entries, own(100))), 'pct-100'), true)
})

test('generation trophy needs every entry of that generation, only present generations listed', () => {
  const entries = [entry('a', 1), entry('b', 1), entry('c', 3)]
  const t = evaluateTrophies(entries, new Set(['a', 'c']))
  assert.deepEqual(t.filter((x) => x.id.startsWith('gen-')).map((x) => x.id), ['gen-1', 'gen-3'])
  assert.equal(t.find((x) => x.id === 'gen-1')!.earned, false)
  assert.equal(t.find((x) => x.id === 'gen-3')!.earned, true)
  assert.deepEqual(t.find((x) => x.id === 'gen-1')!.progress, { owned: 1, total: 2 })
})

test('regional-forms trophy is hidden without regional entries and earned when all owned', () => {
  assert.equal(evaluateTrophies([entry('a', 1)], new Set()).some((x) => x.id === 'regional-forms'), false)
  const entries = [entry('a', 1), entry('r1', 7, true), entry('r2', 8, true)]
  assert.equal(earned(earnedIds(evaluateTrophies(entries, new Set(['r1']))), 'regional-forms'), false)
  assert.equal(earned(earnedIds(evaluateTrophies(entries, new Set(['r1', 'r2']))), 'regional-forms'), true)
})

test('owned slugs outside the entries are ignored', () => {
  const t = evaluateTrophies([entry('a', 1)], new Set(['a', 'x', 'y', 'z']))
  assert.deepEqual(t.find((x) => x.id === 'pct-100')!.progress, { owned: 1, total: 1 })
})
