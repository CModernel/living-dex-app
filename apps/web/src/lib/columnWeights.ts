// Column widths are relative weights, not pixels: each visible column renders at
// `weight / sum(visible weights)` of the table, so the columns always add up to exactly 100%
// of the container (no gaps, no filler column). See TODO 3.8f.

export const MIN_COLUMN_PX = 24

// Columns whose content gets unreadable below the default minimum. Sprite's image scales with
// its column, so below ~48px it turns into a smudge.
export const COLUMN_MIN_PX: Record<string, number> = {
  sprite: 48,
}

export function getColumnMinPx(columnId: string): number {
  return COLUMN_MIN_PX[columnId] ?? MIN_COLUMN_PX
}

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
