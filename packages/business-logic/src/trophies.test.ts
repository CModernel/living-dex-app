import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PokemonEntry } from './data.js'
import { evaluateTrophies, type TrophyTier } from './trophies.js'

function entry(slug: string, generation: number, isRegionalForm = false): PokemonEntry {
  return { slug, generation, isRegionalForm } as PokemonEntry
}

const tier = (id: string, entries: PokemonEntry[]): TrophyTier => ({ id, name: id, entries })
const earnedIds = (t: ReturnType<typeof evaluateTrophies>) => t.filter((x) => x.earned).map((x) => x.id)
const find = (t: ReturnType<typeof evaluateTrophies>, id: string) => t.find((x) => x.id === id)!

test('no tiers earns nothing, empty tiers earn nothing', () => {
  assert.deepEqual(evaluateTrophies([], new Set()), [])
  assert.deepEqual(earnedIds(evaluateTrophies([tier('low', [])], new Set())), [])
})

test('every tier gets 25/50/75/100 milestones ranked by tier position', () => {
  const t = evaluateTrophies([tier('low', [entry('a', 1)]), tier('high', [entry('a', 1), entry('b', 1)])], new Set())
  const ids = t.filter((x) => x.kind === 'milestone').map((x) => x.id)
  assert.deepEqual(ids, [
    'pct-low-25', 'pct-low-50', 'pct-low-75', 'pct-low-100',
    'pct-high-25', 'pct-high-50', 'pct-high-75', 'pct-high-100',
  ])
  assert.equal(find(t, 'pct-low-25').rank, 1)
  assert.equal(find(t, 'pct-high-25').rank, 2)
})

test('milestones trigger exactly at the threshold, per tier', () => {
  const entries = Array.from({ length: 100 }, (_, i) => entry(`p${i}`, 1))
  const tiers = [tier('small', entries.slice(0, 40)), tier('big', entries)]
  const own = (n: number) => new Set(entries.slice(0, n).map((e) => e.slug))
  assert.equal(earnedIds(evaluateTrophies(tiers, own(9))).includes('pct-small-25'), false)
  assert.equal(earnedIds(evaluateTrophies(tiers, own(10))).includes('pct-small-25'), true)
  assert.equal(earnedIds(evaluateTrophies(tiers, own(10))).includes('pct-big-25'), false)
  assert.equal(earnedIds(evaluateTrophies(tiers, own(40))).includes('pct-small-100'), true)
  assert.equal(earnedIds(evaluateTrophies(tiers, own(99))).includes('pct-big-100'), false)
  assert.equal(earnedIds(evaluateTrophies(tiers, own(100))).includes('pct-big-100'), true)
})

test('generation medal takes the best tier it is fully owned in; locked is rank 0 with progress', () => {
  const lite = tier('lite', [entry('a', 1), entry('c', 3)])
  const full = tier('full', [entry('a', 1), entry('b', 1), entry('c', 3)])
  const t = evaluateTrophies([lite, full], new Set(['a', 'c']))
  assert.deepEqual(t.filter((x) => x.kind === 'generation').map((x) => x.id), ['gen-1', 'gen-3'])
  // gen 1 is complete in lite (a) but not in full (b missing) → rank 1
  assert.equal(find(t, 'gen-1').rank, 1)
  assert.equal(find(t, 'gen-1').earned, true)
  const t2 = evaluateTrophies([lite, full], new Set(['a', 'b', 'c']))
  assert.equal(find(t2, 'gen-1').rank, 2)
  const t3 = evaluateTrophies([lite, full], new Set())
  assert.equal(find(t3, 'gen-1').rank, 0)
  assert.equal(find(t3, 'gen-1').earned, false)
  assert.deepEqual(find(t3, 'gen-1').progress, { owned: 0, total: 1 })
})

test('regional-forms medal is hidden without regional entries, ranked by best tier otherwise', () => {
  assert.equal(evaluateTrophies([tier('t', [entry('a', 1)])], new Set()).some((x) => x.id === 'regional-forms'), false)
  const lite = tier('lite', [entry('a', 1), entry('r1', 7, true)])
  const full = tier('full', [entry('a', 1), entry('r1', 7, true), entry('r2', 8, true)])
  assert.equal(find(evaluateTrophies([lite, full], new Set(['r1'])), 'regional-forms').rank, 1)
  assert.equal(find(evaluateTrophies([lite, full], new Set(['r1', 'r2'])), 'regional-forms').rank, 2)
  assert.equal(find(evaluateTrophies([lite, full], new Set()), 'regional-forms').earned, false)
})

test('owned slugs outside every tier are ignored', () => {
  const t = evaluateTrophies([tier('t', [entry('a', 1)])], new Set(['a', 'x', 'y', 'z']))
  assert.deepEqual(find(t, 'pct-t-100').progress, { owned: 1, total: 1 })
})
