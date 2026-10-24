import { expect, test } from 'vitest'
import { getColumnWeight, MIN_COLUMN_PX, resizeAdjacentPair } from './columnWeights'

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
