import assert from 'node:assert/strict'
import { test } from 'node:test'
import { migrateListSettings, resolveListSettings } from './listSettings.js'
import { DEFAULT_LIST_FILTER, DEFAULT_LIST_SETTINGS, DEFAULT_USER_STATE, type PokemonList } from './types.js'

const list = (id: string, extra: Partial<PokemonList> = {}): PokemonList => ({
  id,
  name: id,
  createdAt: '2026-01-01T00:00:00.000Z',
  dataVersion: 'v1',
  variant: 'normal',
  filter: DEFAULT_LIST_FILTER,
  ownedIds: ['a', 'b'],
  ownedGames: { a: ['red'] },
  ...extra,
})

const legacyState = (lists: PokemonList[]) => ({
  ...DEFAULT_USER_STATE,
  lists: Object.fromEntries(lists.map((l) => [l.id, l])),
  preferences: { ...DEFAULT_USER_STATE.preferences, viewMode: 'grid', showFutureSlots: true, excludedGameIds: ['red'] },
})

test('resolveListSettings fills the defaults', () => {
  assert.deepEqual(resolveListSettings(undefined), DEFAULT_LIST_SETTINGS)
  assert.deepEqual(resolveListSettings({ viewMode: 'grid' }), { ...DEFAULT_LIST_SETTINGS, viewMode: 'grid' })
})

test('migration copies the legacy user-level values to every list and drops them from the preferences', () => {
  const out = migrateListSettings(legacyState([list('1'), list('2')]) as never) as ReturnType<typeof legacyState>
  for (const id of ['1', '2']) {
    assert.deepEqual(out.lists[id].settings, { viewMode: 'grid', showFutureSlots: true, excludedGameIds: ['red'] })
  }
  assert.notEqual(out.lists['1'].settings!.excludedGameIds, out.lists['2'].settings!.excludedGameIds)
  for (const key of ['viewMode', 'showFutureSlots', 'excludedGameIds']) assert.ok(!(key in out.preferences))
})

test('migration keeps lists that already have settings, is idempotent, and never touches owned data', () => {
  const kept = list('1', { settings: { viewMode: 'table' } })
  const out = migrateListSettings(legacyState([kept, list('2')]) as never) as ReturnType<typeof legacyState>
  assert.deepEqual(out.lists['1'].settings, { viewMode: 'table' })
  assert.deepEqual(out.lists['2'].ownedIds, ['a', 'b'])
  assert.deepEqual(out.lists['2'].ownedGames, { a: ['red'] })
  assert.equal(migrateListSettings(out as never), out)
})

test('migration with no lists only strips the legacy keys', () => {
  const out = migrateListSettings(legacyState([]) as never) as ReturnType<typeof legacyState>
  assert.deepEqual(out.lists, {})
  assert.ok(!('viewMode' in out.preferences))
})

test('grid settings default to showing everything and merge over a partial stored filter (3.33/3.35)', () => {
  assert.equal(resolveListSettings(undefined).grid.showFutureSlots, true)
  assert.deepEqual(resolveListSettings(undefined).grid.filter, DEFAULT_LIST_FILTER)
  const grid = resolveListSettings({ grid: { filter: { finalStageOnly: true } } }).grid
  assert.deepEqual(grid.filter, { ...DEFAULT_LIST_FILTER, finalStageOnly: true })
  assert.equal(grid.showFutureSlots, true)
})
