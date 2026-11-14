import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeImportedLists, parseImport, serializeExport } from './exportImport.js'
import { DEFAULT_LIST_FILTER, DEFAULT_USER_STATE, type PokemonList, type UserState } from './types.js'

function list(id: string, name: string, extra: Partial<PokemonList> = {}): PokemonList {
  return {
    id,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: ['a', 'b'],
    ...extra,
  }
}

const stateWith = (...lists: PokemonList[]): UserState => ({
  ...DEFAULT_USER_STATE,
  lists: Object.fromEntries(lists.map((l) => [l.id, l])),
})

function envelope(overrides: Record<string, unknown>): string {
  return JSON.stringify({ app: 'living-dex', version: 1, exportedAt: 'x', state: { lists: {} }, ...overrides })
}

test('round-trips lists through serialize and parse', () => {
  const src = list('1', 'Dex', { icon: '⭐', ownedGames: { a: ['red'] } })
  const result = parseImport(serializeExport(stateWith(src)))
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.lists, [src])
})

test('keeps known tier ids and drops unknown ones (3.19)', () => {
  const src = list('1', 'Dex', { tier: 'final-form', layoutTier: 'living-form-full' })
  const ok = parseImport(serializeExport(stateWith(src)))
  if (ok.ok) assert.deepEqual([ok.lists[0].tier, ok.lists[0].layoutTier], ['final-form', 'living-form-full'])
  else assert.fail('expected ok')
  const bad = parseImport(envelope({ state: { lists: { x: { id: 'x', name: 'X', ownedIds: [], tier: 'nope', layoutTier: 3 } } } }))
  if (bad.ok) assert.equal('tier' in bad.lists[0] || 'layoutTier' in bad.lists[0], false)
  else assert.fail('expected ok')
})

test('rejects invalid JSON, wrong app, newer version and missing lists', () => {
  assert.equal(parseImport('nope').ok, false)
  assert.equal(parseImport(envelope({ app: 'other' })).ok, false)
  const newer = parseImport(envelope({ version: 99 }))
  assert.equal(newer.ok, false)
  if (!newer.ok) assert.match(newer.error, /newer version/)
  assert.equal(parseImport(envelope({ state: {} })).ok, false)
})

test('rejects a malformed list instead of half-importing', () => {
  const bad = envelope({ state: { lists: { x: { id: 'x', name: 'X', ownedIds: 'oops' } } } })
  assert.equal(parseImport(bad).ok, false)
})

test('fills a missing filter and repairs ownedGames-implies-owned', () => {
  const raw = envelope({
    state: { lists: { x: { id: 'x', name: 'X', ownedIds: ['a'], ownedGames: { b: ['gold'], c: [] } } } },
  })
  const result = parseImport(raw)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.lists[0].filter, DEFAULT_LIST_FILTER)
  assert.deepEqual(result.lists[0].ownedIds, ['a', 'b'])
  assert.deepEqual(result.lists[0].ownedGames, { b: ['gold'] })
})

test('merge gives imported lists fresh ids and leaves existing ones untouched', () => {
  const existing = { keep: list('keep', 'Mine') }
  let n = 0
  const merged = mergeImportedLists(existing, [list('old', 'Other')], () => `new-${++n}`, new Date('2026-02-02T00:00:00Z'))
  assert.equal(merged.keep, existing.keep)
  assert.equal(merged['new-1'].name, 'Other')
  assert.equal(merged['new-1'].id, 'new-1')
  assert.equal(merged['new-1'].createdAt, '2026-02-02T00:00:00.000Z')
  assert.equal('old' in merged, false)
})

test('merge renames clashing names, numbering repeats', () => {
  let n = 0
  const merged = mergeImportedLists({ k: list('k', 'Dex') }, [list('1', 'Dex'), list('2', 'Dex')], () => `n${++n}`)
  assert.deepEqual(
    Object.values(merged).map((l) => l.name),
    ['Dex', 'Dex (imported)', 'Dex (imported 2)'],
  )
})

test('merging nothing is a no-op', () => {
  const existing = { k: list('k', 'Dex') }
  assert.deepEqual(mergeImportedLists(existing, [], () => 'x'), existing)
})

test('keeps valid list settings and drops invalid ones (3.36)', () => {
  const good = list('1', 'Dex', { settings: { viewMode: 'grid', showFutureSlots: true, excludedGameIds: ['red'] } })
  const result = parseImport(serializeExport(stateWith(good)))
  assert.ok(result.ok)
  assert.deepEqual(result.lists[0].settings, { viewMode: 'grid', showFutureSlots: true, excludedGameIds: ['red'] })
  const bad = parseImport(envelope({ state: { lists: { a: { ...list('a', 'X'), settings: { viewMode: 'cube', showFutureSlots: 'yes', excludedGameIds: [1] } } } } }))
  assert.ok(bad.ok)
  assert.equal(bad.lists[0].settings, undefined)
})

test('keeps the showShiny setting only when it is a boolean (3.70)', () => {
  const good = parseImport(serializeExport(stateWith(list('1', 'Dex', { settings: { showShiny: true } }))))
  assert.ok(good.ok)
  assert.deepEqual(good.lists[0].settings, { showShiny: true })
  const bad = parseImport(envelope({ state: { lists: { a: { ...list('a', 'X'), settings: { showShiny: 'yes' } } } } }))
  assert.ok(bad.ok)
  assert.equal(bad.lists[0].settings, undefined)
})

test('keeps valid grid settings and drops invalid ones (3.35)', () => {
  const good = list('1', 'Dex', { settings: { grid: { showFutureSlots: false, filter: { finalStageOnly: true } } } })
  const result = parseImport(serializeExport(stateWith(good)))
  assert.ok(result.ok)
  assert.deepEqual(result.lists[0].settings, { grid: { showFutureSlots: false, filter: { finalStageOnly: true } } })
  const bad = parseImport(envelope({ state: { lists: { a: { ...list('a', 'X'), settings: { grid: { showFutureSlots: 1, filter: { finalStageOnly: 'x' } } } } } } }))
  assert.ok(bad.ok)
  assert.equal(bad.lists[0].settings, undefined)
})
