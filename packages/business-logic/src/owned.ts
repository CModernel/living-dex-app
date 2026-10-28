import { GAMES } from './availability.js'
import type { PokemonList } from './types.js'

// Owned state and "obtained from" game tags (TODO 3.7b). Owned is the union: any game tag implies
// owned, but an entry can be owned with no tags. All functions return a new list, never mutate.

const NO_GAMES: readonly string[] = Object.freeze([])
const GAME_ORDER = new Map(GAMES.map((game, index) => [game.id, index]))

export function getOwnedGames(list: PokemonList | undefined, slug: string): readonly string[] {
  return list?.ownedGames?.[slug] ?? NO_GAMES
}

function withoutKey(map: Record<string, string[]> | undefined, slug: string): Record<string, string[]> {
  const { [slug]: _removed, ...rest } = map ?? {}
  return rest
}

/**
 * Clicking the Pokémon itself. Not owned → owned with no game tags. Owned → unowned AND every game
 * tag cleared ("resets everything to zero").
 */
export function toggleOwnedEntry(list: PokemonList, slug: string): PokemonList {
  if (list.ownedIds.includes(slug)) {
    return { ...list, ownedIds: list.ownedIds.filter((id) => id !== slug), ownedGames: withoutKey(list.ownedGames, slug) }
  }
  return { ...list, ownedIds: [...list.ownedIds, slug] }
}

/**
 * Clicking one game for a Pokémon. Untagged → tagged, and the Pokémon becomes owned if it wasn't.
 * Tagged → only that tag is removed; the Pokémon stays owned even when it was the last tag.
 */
export function toggleOwnedGame(list: PokemonList, slug: string, gameId: string): PokemonList {
  const current = getOwnedGames(list, slug)

  if (current.includes(gameId)) {
    const remaining = current.filter((id) => id !== gameId)
    const ownedGames =
      remaining.length > 0 ? { ...list.ownedGames, [slug]: remaining } : withoutKey(list.ownedGames, slug)
    return { ...list, ownedGames }
  }

  const tagged = [...current, gameId].sort(
    (a, b) => (GAME_ORDER.get(a) ?? Infinity) - (GAME_ORDER.get(b) ?? Infinity),
  )
  return {
    ...list,
    ownedIds: list.ownedIds.includes(slug) ? list.ownedIds : [...list.ownedIds, slug],
    ownedGames: { ...list.ownedGames, [slug]: tagged },
  }
}
