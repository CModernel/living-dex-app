import { expect, test } from 'vitest'
import { columnWidthsPercent, getColumnMinPx, getColumnWeight, MIN_COLUMN_PX, resizeAdjacentPair } from './columnWeights'

const base = { leftWeight: 100, rightWeight: 100, visibleWeightSum: 400, tablePx: 400 }

test('a drag moves the boundary: left gains what right loses, total unchanged', () => {
  const { left, right } = resizeAdjacentPair({ ...base, deltaPx: 30 })
  expect(left).toBe(130)
  expect(right).toBe(70)
  expect(left + right).toBe(200)
})

test('weights scale to the table width, not raw pixels', () => {
  const { left, right } = resizeAdjacentPair({ ...base, tablePx: 800, deltaPx: 40 })
  expect(left).toBe(120)
  expect(right).toBe(80)
})

test('neither neighbour goes below the minimum', () => {
  const grow = resizeAdjacentPair({ ...base, deltaPx: 10_000 })
  expect(grow.right).toBe(MIN_COLUMN_PX)
  const shrink = resizeAdjacentPair({ ...base, deltaPx: -10_000 })
  expect(shrink.left).toBe(MIN_COLUMN_PX)
})

test('an already-too-narrow column can grow but not shrink further', () => {
  const args = { leftWeight: 10, rightWeight: 190, visibleWeightSum: 400, tablePx: 400 }
  expect(resizeAdjacentPair({ ...args, deltaPx: -5 }).left).toBe(10)
  expect(resizeAdjacentPair({ ...args, deltaPx: 5 }).left).toBe(15)
})

test('getColumnWeight prefers the stored value, then the default', () => {
  expect(getColumnWeight({ name: 321 }, 'name')).toBe(321)
  expect(getColumnWeight({}, 'name')).toBe(200)
  expect(getColumnWeight({}, 'unknown')).toBe(100)
})

test('per-side minimums are honoured (e.g. sprite)', () => {
  const grow = resizeAdjacentPair({ ...base, rightMinPx: 48, deltaPx: 10_000 })
  expect(grow.right).toBe(48)
  const shrink = resizeAdjacentPair({ ...base, leftMinPx: 48, deltaPx: -10_000 })
  expect(shrink.left).toBe(48)
})

test('sprite has a larger minimum than the default', () => {
  expect(getColumnMinPx('sprite')).toBe(48)
  expect(getColumnMinPx('dex')).toBe(MIN_COLUMN_PX)
})

// ---- 3.22 floors at render time ----

test('columnWidthsPercent is the plain weight split when the table is wide or not measured yet', () => {
  const sizing = { name: 200, owned: 100 }
  expect(columnWidthsPercent(['name', 'owned'], sizing, 0)).toEqual([(200 / 300) * 100, (100 / 300) * 100])
  expect(columnWidthsPercent(['name', 'owned'], sizing, 900)).toEqual([(200 / 300) * 100, (100 / 300) * 100])
})

test('columnWidthsPercent keeps Owned and Sprite at their floors on a narrow table and sums to 100', () => {
  const ids = ['sprite', 'dex', 'name', 'species', 'types', 'generation', 'region', 'owned']
  const percents = columnWidthsPercent(ids, {}, 343)
  const px = percents.map((p) => (p / 100) * 343)
  expect(px[ids.indexOf('owned')]).toBeCloseTo(84)
  expect(px[ids.indexOf('sprite')]).toBeCloseTo(48)
  expect(percents.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
})

test('columnWidthsPercent: too many columns for every floor still keeps the special floors', () => {
  const ids = ['sprite', 'dex', 'name', 'species', 'types', 'box', 'slot', 'position', 'generation', 'region', 'availability', 'evolutionStage', 'owned']
  const px = columnWidthsPercent(ids, {}, 343).map((p) => (p / 100) * 343)
  expect(px[ids.length - 1]).toBeCloseTo(84)
  expect(px[0]).toBeCloseTo(48)
  expect(px.reduce((a, b) => a + b, 0)).toBeCloseTo(343)
})
