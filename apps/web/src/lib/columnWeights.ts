// Column widths are relative weights, not pixels: each visible column renders at
// `weight / sum(visible weights)` of the table, so the columns always add up to exactly 100%
// of the container (no gaps, no filler column). See TODO 3.8f.

export const MIN_COLUMN_PX = 24

// Columns whose content gets unreadable below the default minimum. Sprite's image scales with
// its column, so below ~48px it turns into a smudge. Owned holds the checkbox and the "obtained from"
// button side by side, which a phone with many columns used to clip (3.22).
export const COLUMN_MIN_PX: Record<string, number> = {
  sprite: 48,
  owned: 84,
}

export function getColumnMinPx(columnId: string): number {
  return COLUMN_MIN_PX[columnId] ?? MIN_COLUMN_PX
}

export const DEFAULT_COLUMN_WEIGHTS: Record<string, number> = {
  sprite: 72,
  name: 200,
  species: 140,
  types: 140,
  dex: 56,
  box: 44,
  slot: 44,
  position: 44,
  generation: 100,
  region: 100,
  availability: 90,
  evolutionStage: 80,
  owned: 76,
}

const FALLBACK_WEIGHT = 100

export function getColumnWeight(sizing: Record<string, number>, columnId: string): number {
  return sizing[columnId] ?? DEFAULT_COLUMN_WEIGHTS[columnId] ?? FALLBACK_WEIGHT
}

/**
 * Moves the divider between two adjacent columns by `deltaPx`: the left column grows by that
 * much and the right one shrinks by the same amount (or vice versa when negative), clamped so
 * neither drops below its own minimum (`leftMinPx`/`rightMinPx`, default `MIN_COLUMN_PX`). Returns only the two changed weights; their sum is
 * unchanged, so every other column's share of the table stays exactly where it was.
 */
export function resizeAdjacentPair(args: {
  leftWeight: number
  rightWeight: number
  visibleWeightSum: number
  tablePx: number
  deltaPx: number
  leftMinPx?: number
  rightMinPx?: number
}): { left: number; right: number } {
  const { leftWeight, rightWeight, visibleWeightSum, tablePx, deltaPx } = args
  const leftMinPx = args.leftMinPx ?? MIN_COLUMN_PX
  const rightMinPx = args.rightMinPx ?? MIN_COLUMN_PX
  if (tablePx <= 0 || visibleWeightSum <= 0) return { left: leftWeight, right: rightWeight }

  const pxPerWeight = tablePx / visibleWeightSum
  const leftPx = leftWeight * pxPerWeight
  const rightPx = rightWeight * pxPerWeight

  // If the pair is already tighter than the minimum combined, don't move anything.
  const lo = Math.min(0, leftMinPx - leftPx)
  const hi = Math.max(0, rightPx - rightMinPx)
  const delta = Math.min(hi, Math.max(lo, deltaPx))

  return {
    left: (leftPx + delta) / pxPerWeight,
    right: (rightPx - delta) / pxPerWeight,
  }
}

/**
 * Column widths in % of the table (always summing to 100), proportional to their weights but never below each
 * column's minimum in px when the table width is known (3.22: on a phone with many columns the floors win and the
 * other columns share what is left). With `tablePx` 0 (not measured yet) it is the plain proportional split.
 */
export function columnWidthsPercent(ids: readonly string[], sizing: Record<string, number>, tablePx: number): number[] {
  const weights = ids.map((id) => getColumnWeight(sizing, id))
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return ids.map(() => 100 / Math.max(ids.length, 1))
  if (tablePx <= 0) return weights.map((w) => (w / total) * 100)
  let mins = ids.map(getColumnMinPx)
  // Too many columns for every floor: keep the special floors (owned, sprite) and let the others share the rest.
  if (mins.reduce((a, b) => a + b, 0) >= tablePx) mins = ids.map((id) => COLUMN_MIN_PX[id] ?? 0)
  const minSum = mins.reduce((a, b) => a + b, 0)
  if (minSum >= tablePx) return mins.map((m) => (m / minSum) * 100)
  // Pin every column whose share falls under its floor, then split the rest by weight; repeat until stable.
  const pinned = new Set<number>()
  for (;;) {
    const freePx = tablePx - [...pinned].reduce((sum, i) => sum + mins[i], 0)
    const freeWeight = weights.reduce((sum, w, i) => (pinned.has(i) ? sum : sum + w), 0)
    const newlyPinned = weights.findIndex((w, i) => !pinned.has(i) && (w / freeWeight) * freePx < mins[i])
    if (newlyPinned === -1) {
      return weights.map((w, i) => ((pinned.has(i) ? mins[i] : (w / freeWeight) * freePx) / tablePx) * 100)
    }
    pinned.add(newlyPinned)
  }
}
