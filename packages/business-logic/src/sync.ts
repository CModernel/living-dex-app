import { GAMES } from './availability.js'
import type { PokemonList } from './types.js'

const GAME_ORDER = new Map(GAMES.map((game, index) => [game.id, index]))
const byRelease = (a: string, b: string) => (GAME_ORDER.get(a) ?? Infinity) - (GAME_ORDER.get(b) ?? Infinity)

function unionGames(a: Record<string, string[]> | undefined, b: Record<string, string[]> | undefined) {
  if (!a && !b) return undefined
  const out: Record<string, string[]> = {}
  for (const source of [a, b]) {
    for (const [slug, games] of Object.entries(source ?? {})) out[slug] = [...new Set([...(out[slug] ?? []), ...games])]
  }
  for (const slug of Object.keys(out)) out[slug].sort(byRelease)
  return out
}

/**
 * 3.41 "Sync now": combines this device's lists with the cloud's, by list id. A list on both sides keeps this device's
 * name, tiers, filters and settings, and gets the UNION of owned Pokémon and of their game tags; a list on one side only
 * is kept. Nothing owned is ever removed, and merging the result again changes nothing (idempotent). v1 limitation: an
 * un-marked Pokémon or a deleted list comes back from a device that still has it (tombstones arrive with 3.42).
 */
export function mergeLists(
  local: Record<string, PokemonList>,
  remote: readonly PokemonList[],
): Record<string, PokemonList> {
  const result: Record<string, PokemonList> = { ...local }
  for (const theirs of remote) {
    const ours = result[theirs.id]
    if (!ours) {
      result[theirs.id] = theirs
      continue
    }
    const ownedGames = unionGames(ours.ownedGames, theirs.ownedGames)
    const ownedIds = [...new Set([...ours.ownedIds, ...theirs.ownedIds, ...Object.keys(ownedGames ?? {})])]
    result[theirs.id] = { ...ours, ownedIds, ...(ownedGames ? { ownedGames } : {}) }
  }
  return result
}
