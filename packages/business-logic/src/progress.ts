import type { PokemonEntry } from './data.js'

export type OwnedProgress = { owned: number; total: number; percent: number }

/** Owned count over a collection's visible entries (TODO 3.8 #21). Percent is a whole number, 0 when empty. */
export function ownedProgress(entries: readonly PokemonEntry[], ownedIds: ReadonlySet<string>): OwnedProgress {
  const total = entries.length
  const owned = entries.filter((e) => ownedIds.has(e.slug)).length
  return { owned, total, percent: total === 0 ? 0 : Math.floor((owned / total) * 100) }
}
