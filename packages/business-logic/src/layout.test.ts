import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PokemonEntry } from './data.js'
import {
  coversTier,
  effectiveLayoutTier,
  isTierId,
  layoutPositions,
  resolveListTiers,
  tierSlugSets,
  validTargets,
  type TierId,
} from './layout.js'

const e = (slug: string, sortIndex: number, tags: string[] = []) => ({ slug, sortIndex, tags }) as unknown as PokemonEntry & { tags: string[] }
const has = (tag: string) => (x: PokemonEntry) => (x as unknown as { tags: string[] }).tags.includes(tag)

// Mirrors the real containment, including the "floette" case: in final-form but not in living-lite.
const entries = [
  e('a', 0, ['lf', 'lite', 'ff', 'f']),
  e('b', 1, ['lf', 'lite']),
  e('gender', 2, []),
  e('floette', 3, ['lf', 'ff', 'f']),
  e('form', 4, ['lf', 'ff']),
]
const predicates: Record<TierId, (x: PokemonEntry) => boolean> = {
  'living-form-full': () => true,
  'living-form': has('lf'),
  'living-lite': has('lite'),
  'final-form-full': has('ff'),
  'final-form': has('f'),
}
const sets = tierSlugSets(entries, predicates)

test('resolveListTiers defaults legacy lists to living-form on living-form', () => {
  assert.deepEqual(resolveListTiers(undefined), { tier: 'living-form', layoutTier: 'living-form' })
  assert.deepEqual(resolveListTiers({}), { tier: 'living-form', layoutTier: 'living-form' })
  assert.deepEqual(resolveListTiers({ tier: 'final-form' }), { tier: 'final-form', layoutTier: 'final-form' })
  assert.deepEqual(resolveListTiers({ tier: 'final-form', layoutTier: 'living-form-full' }), {
    tier: 'final-form',
    layoutTier: 'living-form-full',
  })
  assert.deepEqual(resolveListTiers({ tier: 'nope' as TierId }), { tier: 'living-form', layoutTier: 'living-form' })
  assert.equal(isTierId('living-lite'), true)
  assert.equal(isTierId('x'), false)
})

test('coversTier is set containment computed from data', () => {
  assert.equal(coversTier(sets, 'living-form-full', 'final-form'), true)
  assert.equal(coversTier(sets, 'living-form', 'living-form'), true)
  assert.equal(coversTier(sets, 'living-form', 'living-form-full'), false)
  assert.equal(coversTier(sets, 'living-lite', 'final-form'), false) // floette
})

test('validTargets are strict supersets only', () => {
  assert.deepEqual(validTargets(sets, 'final-form'), ['living-form-full', 'living-form', 'final-form-full'])
  assert.deepEqual(validTargets(sets, 'living-lite'), ['living-form-full', 'living-form'])
  assert.deepEqual(validTargets(sets, 'living-form-full'), [])
})

test('effectiveLayoutTier falls back to the working tier when the layout does not hold it', () => {
  assert.equal(effectiveLayoutTier(sets, 'final-form', 'living-form-full'), 'living-form-full')
  assert.equal(effectiveLayoutTier(sets, 'living-form-full', 'living-form'), 'living-form-full')
})

test('layoutPositions follow sortIndex, roll over per box, and skip entries outside the layout', () => {
  const many = Array.from({ length: 65 }, (_, i) => e(`m${i}`, 64 - i))
  const pos = layoutPositions(many, () => true)
  assert.deepEqual(pos.get('m64'), { box: 1, slot: 1 })
  assert.deepEqual(pos.get('m35'), { box: 1, slot: 30 })
  assert.deepEqual(pos.get('m34'), { box: 2, slot: 1 })
  assert.deepEqual(pos.get('m0'), { box: 3, slot: 5 })

  const lf = layoutPositions(entries, predicates['living-form'], 2)
  assert.equal(lf.has('gender'), false)
  assert.deepEqual(lf.get('floette'), { box: 2, slot: 1 })
  // A final-form list laid out on living-form keeps living-form numbers: 'b' leaves slot 2 unused.
  assert.deepEqual([lf.get('a'), lf.get('floette')], [{ box: 1, slot: 1 }, { box: 2, slot: 1 }])
})
