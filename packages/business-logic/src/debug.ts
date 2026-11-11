import type { PokemonList } from './types.js'

// Helpers behind the dev-only `?debug` panel (TODO 3.20). Pure like owned.ts: they return a new list.

/** Marks every given slug as owned (existing ownership and game tags are kept; no duplicates). */
export function markOwned(list: PokemonList, slugs: readonly string[]): PokemonList {
  const owned = new Set(list.ownedIds)
  for (const slug of slugs) owned.add(slug)
  return { ...list, ownedIds: [...owned] }
}

/** Un-owns everything, including all "obtained from" game tags. */
export function clearOwned(list: PokemonList): PokemonList {
  return { ...list, ownedIds: [], ownedGames: {} }
}
