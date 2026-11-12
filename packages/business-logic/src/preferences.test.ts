import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { reconcilePreferences } from './preferences.js'
import { DEFAULT_USER_STATE } from './types.js'

const defaults = DEFAULT_USER_STATE.preferences

const legacyOrder = ['sprite', 'name', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned']

test('a legacy state gets new columns inserted after their default predecessor, hidden', () => {
  const result = reconcilePreferences({ ...defaults, columnOrder: legacyOrder, visibleColumns: ['dex', 'region'] })
  assert.deepEqual(result.columnOrder, [
    'sprite', 'name', 'species', 'types', 'box', 'slot', 'position', 'dex', 'generation', 'region', 'availability', 'evolutionStage', 'owned',
  ])
  assert.deepEqual(result.visibleColumns, ['dex', 'region'])
})

test('a user-reordered legacy state keeps its order; new columns follow their default predecessor', () => {
  const result = reconcilePreferences({
    ...defaults,
    columnOrder: ['owned', 'dex', 'name', 'sprite', 'types', 'generation', 'region', 'evolutionStage'],
    visibleColumns: [],
  })
  assert.deepEqual(result.columnOrder, [
    'owned', 'dex', 'name', 'species', 'sprite', 'types', 'box', 'slot', 'position', 'generation', 'region', 'availability', 'evolutionStage',
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
  assert.deepEqual(result.columnOrder, defaults.columnOrder)
  // No prefsVersion stored: `types` (hideable since v1) is kept visible once.
  assert.deepEqual(result.visibleColumns, ['types'])
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

test('fresh defaults show only Dex next to the sprite; Types, Box and Slot start hidden', () => {
  assert.deepEqual(defaults.visibleColumns, ['dex'])
  assert.deepEqual(defaults.columnOrder.slice(0, 3), ['sprite', 'dex', 'name'])
  assert.equal(defaults.prefsVersion, 1)
})

test('a pre-prefsVersion state keeps Types visible once, then respects a later hide', () => {
  const stored = { ...defaults, prefsVersion: undefined, visibleColumns: ['dex', 'box'] }
  const once = reconcilePreferences(stored)
  assert.deepEqual(once.visibleColumns, ['dex', 'box', 'types'])
  assert.equal(once.prefsVersion, 1)
  const hidden = reconcilePreferences({ ...once, visibleColumns: ['dex'] })
  assert.deepEqual(hidden.visibleColumns, ['dex'])
})

test('Types is not duplicated when a legacy state already lists it', () => {
  const result = reconcilePreferences({ ...defaults, prefsVersion: undefined, visibleColumns: ['types', 'dex'] })
  assert.deepEqual(result.visibleColumns, ['types', 'dex'])
})
