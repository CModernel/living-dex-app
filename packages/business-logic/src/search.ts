import type { PokemonEntry } from './data.js'

/**
 * 3.32 search: a query matches an entry by name/species (case-insensitive substring) or, when it is a number
 * (optionally "#6"), by its exact Dex number. Empty queries match everything. Display-only: it never changes
 * progress, trophies or Box/Slot.
 */
export function matchesSearch(entry: Pick<PokemonEntry, 'name' | 'species' | 'dex'>, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, '')
  if (!q) return true
  if (/^\d+$/.test(q) && Number(entry.dex) === Number(q)) return true
  return entry.name.toLowerCase().includes(q) || entry.species.toLowerCase().includes(q)
}
