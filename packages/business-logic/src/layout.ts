import type { PokemonEntry } from './data.js'
import type { PokemonList } from './types.js'

// Tier per list and stable Box/Slot (TODO 3.19). Box/Slot is the position in the LAYOUT tier's full
// `sortIndex` order, computed before any list filter or game selection, so neither can move it. Entries of
// the layout tier that are not in the working tier leave numbers unused (a reserved slot in HOME).
// Tier predicates are passed in: the tiers package is only a devDependency here.

export const TIER_IDS = ['living-form-full', 'living-form', 'living-lite', 'final-form-full', 'final-form'] as const
export type TierId = (typeof TIER_IDS)[number]

export const DEFAULT_TIER: TierId = 'living-form'
export const BOX_SIZE = 30

export function isTierId(value: unknown): value is TierId {
  return typeof value === 'string' && (TIER_IDS as readonly string[]).includes(value)
}

/** Lists saved before 3.19 have neither field: they behave as Living Form, laid out on Living Form. */
export function resolveListTiers(list: Pick<PokemonList, 'tier' | 'layoutTier'> | undefined): {
  tier: TierId
  layoutTier: TierId
} {
  const tier = isTierId(list?.tier) ? list.tier : DEFAULT_TIER
  const layoutTier = isTierId(list?.layoutTier) ? list.layoutTier : tier
  return { tier, layoutTier }
}

export type TierSlugSets = Record<TierId, ReadonlySet<string>>

export function tierSlugSets(
  entries: readonly PokemonEntry[],
  predicates: Record<TierId, (entry: PokemonEntry) => boolean>,
): TierSlugSets {
  const sets = {} as Record<TierId, Set<string>>
  for (const id of TIER_IDS) sets[id] = new Set(entries.filter(predicates[id]).map((e) => e.slug))
  return sets
}

/** True when every entry of `inner` also exists in `outer` (a tier always covers itself). */
export function coversTier(sets: TierSlugSets, outer: TierId, inner: TierId): boolean {
  const big = sets[outer]
  for (const slug of sets[inner]) if (!big.has(slug)) return false
  return true
}

/** Tiers a list starting at `start` can grow into without moving anything: strict supersets of it. */
export function validTargets(sets: TierSlugSets, start: TierId): TierId[] {
  return TIER_IDS.filter((id) => id !== start && sets[id].size > sets[start].size && coversTier(sets, id, start))
}

/** The layout actually used: the planned one when it holds the working tier, otherwise the working tier itself. */
export function effectiveLayoutTier(sets: TierSlugSets, tier: TierId, layoutTier: TierId): TierId {
  return coversTier(sets, layoutTier, tier) ? layoutTier : tier
}

export function layoutPositions(
  entries: readonly PokemonEntry[],
  inLayout: (entry: PokemonEntry) => boolean,
  boxSize: number = BOX_SIZE,
): Map<string, { box: number; slot: number }> {
  const positions = new Map<string, { box: number; slot: number }>()
  entries
    .filter(inLayout)
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .forEach((entry, index) => {
      positions.set(entry.slug, { box: Math.floor(index / boxSize) + 1, slot: (index % boxSize) + 1 })
    })
  return positions
}

// --- 3.19b: plan state. A list created from the tier picker has `tier` but no `layoutTier` yet: its box plan is
// undecided and Box/Slot stay hidden until the user plans a bigger goal or answers "Not now" (plan = tier).

export type PlanState = { tier: TierId; layoutTier: TierId; decided: boolean }

/**
 * Lists saved before 3.19b (no `tier`) are decided, as before. A tier with nothing bigger is always decided. A stored
 * plan that no longer contains the tier (dataset update, edited import) counts as undecided, never as a silent
 * re-numbering. `sets` may be null while the dataset loads: the stored fields are trusted until then.
 */
export function planState(
  list: Pick<PokemonList, 'tier' | 'layoutTier'> | undefined,
  sets: TierSlugSets | null,
): PlanState {
  const { tier, layoutTier } = resolveListTiers(list)
  if (!isTierId(list?.tier)) return { tier, layoutTier, decided: true }
  const hasPlan = isTierId(list.layoutTier)
  if (!sets) return { tier, layoutTier, decided: hasPlan }
  if (validTargets(sets, tier).length === 0) return { tier, layoutTier: tier, decided: true }
  if (hasPlan && (layoutTier === tier || validTargets(sets, tier).includes(layoutTier))) {
    return { tier, layoutTier, decided: true }
  }
  return { tier, layoutTier: tier, decided: false }
}

export type PlanOption = { tier: TierId; extraSlots: number; keep: boolean }

/** Bigger goals for `tier` (strict supersets only), the previous plan first when it still fits. */
export function planOptions(sets: TierSlugSets, tier: TierId, previous?: TierId): PlanOption[] {
  const targets = validTargets(sets, tier)
  const ordered = previous && targets.includes(previous) ? [previous, ...targets.filter((t) => t !== previous)] : targets
  return ordered.map((t) => ({ tier: t, extraSlots: sets[t].size - sets[tier].size, keep: t === previous }))
}

/** Owned entries that are not part of `tier` (kept on the list, just not shown). */
export function ownedOutsideTier(sets: TierSlugSets, tier: TierId, ownedIds: readonly string[]): number {
  let n = 0
  for (const slug of ownedIds) if (!sets[tier].has(slug)) n += 1
  return n
}
