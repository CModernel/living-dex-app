import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { reconcilePreferences } from './preferences.js'
import { DEFAULT_USER_STATE } from './types.js'

const defaults = DEFAULT_USER_STATE.preferences

const legacyOrder = ['sprite', 'name', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned']

test('a legacy state without box/slot gets them inserted after dex and made visible', () => {
  const result = reconcilePreferences({ ...defaults, columnOrder: legacyOrder, visibleColumns: ['dex', 'region'] })
  assert.deepEqual(result.columnOrder, defaults.columnOrder)
  assert.deepEqual(result.visibleColumns, ['dex', 'region', 'box', 'slot'])
})

test('a user-reordered legacy state keeps its order; new columns follow their default predecessor', () => {
  const result = reconcilePreferences({
    ...defaults,
    columnOrder: ['owned', 'dex', 'name', 'sprite', 'types', 'generation', 'region', 'evolutionStage'],
    visibleColumns: [],
  })
  assert.deepEqual(result.columnOrder, [
    'owned', 'dex', 'box', 'slot', 'position', 'name', 'species', 'sprite', 'types', 'generation', 'region', 'availability', 'evolutionStage',
  ])
})

test('a state that already knows the columns is left alone (a hidden Box stays hidden)', () => {
  const stored = { ...defaults, visibleColumns: ['dex'], columnOrder: ['slot', ...defaults.columnOrder.filter((id) => id !== 'slot')] }
  const result = reconcilePreferences(stored)
  assert.deepEqual(result.columnOrder, stored.columnOrder)
  assert.deepEqual(result.visibleColumns, ['dex'])
})

test('missing keys are filled from the defaults', () => {
  const result = reconcilePreferences({ visibleColumns: [], compactMode: false } as never)
  assert.deepEqual(result.columnSizing, {})
  assert.deepEqual(result.excludedGameIds, [])
  assert.deepEqual(result.columnOrder, defaults.columnOrder)
  assert.deepEqual(result.visibleColumns, [])
})

test('a pre-3.8d state gets the Availability column inserted after region, hidden', () => {
  const pre38d = defaults.columnOrder.filter((id) => id !== 'availability')
  const result = reconcilePreferences({ ...defaults, columnOrder: pre38d, visibleColumns: ['dex'] })
  assert.deepEqual(result.columnOrder, defaults.columnOrder)
  assert.deepEqual(result.visibleColumns, ['dex'])
})

test('undefined preferences become the defaults', () => {
  assert.deepEqual(reconcilePreferences(undefined), defaults)
})

test('is idempotent', () => {
  const once = reconcilePreferences({ ...defaults, columnOrder: legacyOrder, visibleColumns: ['dex'] })
  assert.deepEqual(reconcilePreferences(once), once)
})
