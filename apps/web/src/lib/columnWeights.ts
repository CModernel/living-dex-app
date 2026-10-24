// Column widths are relative weights, not pixels: each visible column renders at
// `weight / sum(visible weights)` of the table, so the columns always add up to exactly 100%
// of the container (no gaps, no filler column). See TODO 3.8f.

export const MIN_COLUMN_PX = 24

export const DEFAULT_COLUMN_WEIGHTS: Record<string, number> = {
  sprite: 72,
  name: 200,
  types: 140,
  dex: 56,
  generation: 100,
  region: 100,
  evolutionStage: 80,
  owned: 48,
}

const FALLBACK_WEIGHT = 100

export function getColumnWeight(sizing: Record<string, number>, columnId: string): number {
  return sizing[columnId] ?? DEFAULT_COLUMN_WEIGHTS[columnId] ?? FALLBACK_WEIGHT
}

/**
 * Moves the divider between two adjacent columns by `deltaPx`: the left column grows by that
 * much and the right one shrinks by the same amount (or vice versa when negative), clamped so
 * neither drops below `MIN_COLUMN_PX`. Returns only the two changed weights; their sum is
 * unchanged, so every other column's share of the table stays exactly where it was.
 */
export function resizeAdjacentPair(args: {
  leftWeight: number
  rightWeight: number
  visibleWeightSum: number
  tablePx: number
  deltaPx: number
}): { left: number; right: number } {
  const { leftWeight, rightWeight, visibleWeightSum, tablePx, deltaPx } = args
  if (tablePx <= 0 || visibleWeightSum <= 0) return { left: leftWeight, right: rightWeight }

  const pxPerWeight = tablePx / visibleWeightSum
  const leftPx = leftWeight * pxPerWeight
  const rightPx = rightWeight * pxPerWeight

  // If the pair is already tighter than the minimum combined, don't move anything.
  const lo = Math.min(0, MIN_COLUMN_PX - leftPx)
  const hi = Math.max(0, rightPx - MIN_COLUMN_PX)
  const delta = Math.min(hi, Math.max(lo, deltaPx))

  return {
    left: (leftPx + delta) / pxPerWeight,
    right: (rightPx - delta) / pxPerWeight,
  }
}
