import type { PokemonEntry } from './data.js'

// Local trophies (TODO 3.14 / 3.14b): computed from the collection's owned set against the FULL
// entry set of every tier — never from the visible/filtered rows and never stored, so there is no
// flag to drift out of sync and no display filter can move a medal.

// A tier as the trophies see it. `rank` is implied by position: callers pass tiers ordered from
// the smallest/easiest to the largest/hardest, and the first one is rank 1.
export type TrophyTier = { id: string; name: string; entries: readonly PokemonEntry[] }

export type TrophyKind = 'milestone' | 'generation' | 'regional'

export type Trophy = {
  id: string
  kind: TrophyKind
  name: string
  description: string
  earned: boolean
  // 1-based position of the tier this medal belongs to (milestones) or the best tier it was
  // completed in (generation / regional). 0 while a generation / regional medal is still locked.
  rank: number
  // Milestones only: which tier and which percentage.
  tierId?: string
  tierName?: string
  milestone?: number
  // Generation medals only.
  generation?: number
  progress: { owned: number; total: number }
}

export const MILESTONES = [25, 50, 75, 100] as const

function count(entries: readonly PokemonEntry[], ownedIds: ReadonlySet<string>): { owned: number; total: number } {
  let owned = 0
  for (const e of entries) if (ownedIds.has(e.slug)) owned += 1
  return { owned, total: entries.length }
}

// The best (highest-rank) tier in which `pick(entries)` is completely owned; falls back to the
// lowest tier that has any such entries so a locked medal still shows its closest progress.
function bestTier(
  tiers: readonly TrophyTier[],
  ownedIds: ReadonlySet<string>,
  pick: (entries: readonly PokemonEntry[]) => PokemonEntry[],
): { rank: number; progress: { owned: number; total: number } } {
  let rank = 0
  let progress = { owned: 0, total: 0 }
  let fallback: { owned: number; total: number } | null = null
  tiers.forEach((tier, index) => {
    const c = count(pick(tier.entries), ownedIds)
    if (c.total === 0) return
    fallback ??= c
    if (c.owned === c.total) {
      rank = index + 1
      progress = c
    }
  })
  return { rank, progress: rank > 0 ? progress : (fallback ?? progress) }
}

export function evaluateTrophies(tiers: readonly TrophyTier[], ownedIds: ReadonlySet<string>): Trophy[] {
  const trophies: Trophy[] = []

  tiers.forEach((tier, index) => {
    const progress = count(tier.entries, ownedIds)
    for (const pct of MILESTONES) {
      const needed = Math.ceil((progress.total * pct) / 100)
      trophies.push({
        id: `pct-${tier.id}-${pct}`,
        kind: 'milestone',
        name: `${tier.name} ${pct}%`,
        description: `Own ${pct}% of ${tier.name}`,
        earned: progress.total > 0 && progress.owned >= needed,
        rank: index + 1,
        tierId: tier.id,
        tierName: tier.name,
        milestone: pct,
        progress,
      })
    }
  })

  const generations = new Set<number>()
  for (const tier of tiers) for (const e of tier.entries) generations.add(e.generation)
  for (const gen of [...generations].sort((a, b) => a - b)) {
    const { rank, progress } = bestTier(tiers, ownedIds, (entries) => entries.filter((e) => e.generation === gen))
    trophies.push({
      id: `gen-${gen}`,
      kind: 'generation',
      name: `Generation ${gen}`,
      description: rank > 0 ? `Every Generation ${gen} entry, up to ${tiers[rank - 1].name}` : `Own every Generation ${gen} entry`,
      earned: rank > 0,
      rank,
      generation: gen,
      progress,
    })
  }

  const hasRegional = tiers.some((tier) => tier.entries.some((e) => e.isRegionalForm))
  if (hasRegional) {
    const { rank, progress } = bestTier(tiers, ownedIds, (entries) => entries.filter((e) => e.isRegionalForm))
    trophies.push({
      id: 'regional-forms',
      kind: 'regional',
      name: 'Regional forms',
      description: rank > 0 ? `Every regional form, up to ${tiers[rank - 1].name}` : 'Own every regional form',
      earned: rank > 0,
      rank,
      progress,
    })
  }

  return trophies
}
