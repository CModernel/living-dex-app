import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { TIERS } from '@cmodernel/living-dex-tiers'
import { applyListFilter } from './filter.js'
import { DEFAULT_LIST_FILTER, type ListFilter } from './types.js'
import type { PokemonEntry } from './data.js'

function makeEntry(overrides: Partial<PokemonEntry> = {}): PokemonEntry {
  return {
    slug: 'bulbasaur',
    pokeapiSlug: 'bulbasaur',
    csvKeyword: 'bulbasaur',
    name: 'Bulbasaur',
    species: 'bulbasaur',
    dex: '0001',
    types: ['grass', 'poison'],
    generation: 1,
    regionalDex: {},
    sprites: { id: '1', hasFemale: false, hasShinyFemale: false },
    evolutionStage: 'pre',
    isAlternateForm: false,
    isGenderVariant: false,
    isRegionalForm: false,
    region: null,
    hasStatOrTypeDifference: false,
    sortIndex: 0,
    ...overrides,
  }
}

const alwaysTrue = () => true

test('default filter is a no-op', () => {
  const filtered = applyListFilter(alwaysTrue, DEFAULT_LIST_FILTER)
  assert.equal(filtered(makeEntry()), true)
  assert.equal(filtered(makeEntry({ evolutionStage: 'mid', isAlternateForm: true, isGenderVariant: true })), true)
})

test('base predicate rejection short-circuits regardless of filter', () => {
  const filtered = applyListFilter(() => false, DEFAULT_LIST_FILTER)
  assert.equal(filtered(makeEntry()), false)
})

test('finalStageOnly drops non-final entries', () => {
  const filter: ListFilter = { ...DEFAULT_LIST_FILTER, finalStageOnly: true }
  const filtered = applyListFilter(alwaysTrue, filter)
  assert.equal(filtered(makeEntry({ evolutionStage: 'final' })), true)
  assert.equal(filtered(makeEntry({ evolutionStage: 'pre' })), false)
  assert.equal(filtered(makeEntry({ evolutionStage: 'mid' })), false)
})

test('regionalFormsOnly drops non-regional alternate forms but keeps regional ones', () => {
  const filter: ListFilter = { ...DEFAULT_LIST_FILTER, regionalFormsOnly: true }
  const filtered = applyListFilter(alwaysTrue, filter)
  assert.equal(filtered(makeEntry({ isAlternateForm: false })), true)
  assert.equal(filtered(makeEntry({ isAlternateForm: true, isRegionalForm: true })), true)
  assert.equal(filtered(makeEntry({ isAlternateForm: true, isRegionalForm: false })), false)
})

test('hideGenderVariants drops gender variants', () => {
  const filter: ListFilter = { ...DEFAULT_LIST_FILTER, hideGenderVariants: true }
  const filtered = applyListFilter(alwaysTrue, filter)
  assert.equal(filtered(makeEntry({ isGenderVariant: false })), true)
  assert.equal(filtered(makeEntry({ isGenderVariant: true })), false)
})

test('toggles compose together (AND semantics)', () => {
  const filter: ListFilter = {
    finalStageOnly: true,
    regionalFormsOnly: true,
    hideGenderVariants: true,
  }
  const filtered = applyListFilter(alwaysTrue, filter)
  // Passes all three.
  assert.equal(
    filtered(
      makeEntry({
        evolutionStage: 'final',
        isAlternateForm: true,
        isRegionalForm: true,
        isGenderVariant: false,
      }),
    ),
    true,
  )
  // Fails only finalStageOnly.
  assert.equal(
    filtered(
      makeEntry({
        evolutionStage: 'mid',
        isAlternateForm: true,
        isRegionalForm: true,
        isGenderVariant: false,
      }),
    ),
    false,
  )
})

test('does not mutate the base predicate or the entry', () => {
  const entry = makeEntry({ evolutionStage: 'final' })
  const frozenEntry = Object.freeze({ ...entry })
  const filter: ListFilter = { ...DEFAULT_LIST_FILTER, finalStageOnly: true }
  const filtered = applyListFilter(alwaysTrue, filter)
  assert.doesNotThrow(() => filtered(frozenEntry))
  assert.deepEqual(frozenEntry, entry)
})

// 3.6c interaction: hideGenderVariants is a no-op against the 4 pre-existing tiers (they
// already unconditionally drop every gender variant themselves), and only has a real effect
// against living-form-full (predicate `e => true`), the one tier that lets gender variants
// through in the first place.
test('hideGenderVariants is a no-op under living-form (already excludes gender variants)', () => {
  const genderVariant = makeEntry({ csvKeyword: 'venusaur-f', isGenderVariant: true })
  const withoutFilter = applyListFilter(TIERS['living-form'].predicate, DEFAULT_LIST_FILTER)
  const withFilter = applyListFilter(TIERS['living-form'].predicate, {
    ...DEFAULT_LIST_FILTER,
    hideGenderVariants: true,
  })
  assert.equal(withoutFilter(genderVariant), false)
  assert.equal(withFilter(genderVariant), false)
})

test('hideGenderVariants actively removes gender variants under living-form-full', () => {
  const genderVariant = makeEntry({ csvKeyword: 'venusaur-f', isGenderVariant: true })
  const withoutFilter = applyListFilter(TIERS['living-form-full'].predicate, DEFAULT_LIST_FILTER)
  const withFilter = applyListFilter(TIERS['living-form-full'].predicate, {
    ...DEFAULT_LIST_FILTER,
    hideGenderVariants: true,
  })
  assert.equal(withoutFilter(genderVariant), true)
  assert.equal(withFilter(genderVariant), false)
})
