import { expect, test } from 'vitest'
import { computePopoverPosition } from './popoverPosition'

const viewport = { width: 1000, height: 800 }
const popover = { width: 200, height: 300 }

test('opens below the trigger, right-aligned to it, when there is room', () => {
  const anchor = { top: 100, bottom: 120, left: 700, right: 730 }
  expect(computePopoverPosition(anchor, popover, viewport)).toEqual({ top: 124, left: 530, maxHeight: 668 })
})

test('flips above the trigger near the bottom of the viewport', () => {
  const anchor = { top: 700, bottom: 720, left: 700, right: 730 }
  expect(computePopoverPosition(anchor, popover, viewport)).toEqual({ top: 396, left: 530, maxHeight: 688 })
})

test('clamps to the left margin on a narrow screen', () => {
  const anchor = { top: 100, bottom: 120, left: 40, right: 70 }
  expect(computePopoverPosition(anchor, popover, { width: 390, height: 844 }).left).toBe(8)
})

test('clamps to the right edge when the trigger is past it', () => {
  const anchor = { top: 100, bottom: 120, left: 1100, right: 1130 }
  expect(computePopoverPosition(anchor, popover, viewport).left).toBe(792)
})

test('when neither side fits, it takes the roomier side, caps its height and never covers the trigger', () => {
  // A short window: 129px below the trigger, 166px above it.
  const anchor = { top: 178, bottom: 198, left: 900, right: 930 }
  const short = { width: 1400, height: 339 }
  const result = computePopoverPosition(anchor, { width: 240, height: 281 }, short)
  expect(result).toEqual({ top: 8, left: 690, maxHeight: 166 })
  expect(result.top + result.maxHeight).toBeLessThanOrEqual(anchor.top - 4)
})

test('a tall popover below a high trigger is capped to the space below', () => {
  const anchor = { top: 50, bottom: 70, left: 700, right: 730 }
  const result = computePopoverPosition(anchor, { width: 200, height: 2000 }, viewport)
  expect(result).toEqual({ top: 74, left: 530, maxHeight: 718 })
})
