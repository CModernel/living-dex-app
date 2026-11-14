import { GAMES } from './availability.js'
import type { PokemonEntry } from './data.js'
import type { PokemonList } from './types.js'

/** One bar of the dashboard: how many of `total` entries are owned. */
export type StatRow = { key: string; label: string; owned: number; total: number }

function rows(entries: PokemonEntry[], owned: ReadonlySet<string>, keysOf: (entry: PokemonEntry) => string[]): Map<string, StatRow> {
  const map = new Map<string, StatRow>()
  for (const entry of entries) {
    for (const key of keysOf(entry)) {
      const row = map.get(key) ?? { key, label: key, owned: 0, total: 0 }
      row.total++
      if (owned.has(entry.slug)) row.owned++
      map.set(key, row)
    }
  }
  return map
}

/** Owned vs total per Pokémon type; a dual type counts for both of its types. Sorted by owned, then total. */
export function statsByType(entries: PokemonEntry[], owned: ReadonlySet<string>): StatRow[] {
  return [...rows(entries, owned, (e) => e.types).values()].sort((a, b) => b.owned - a.owned || b.total - a.total || a.key.localeCompare(b.key))
}

/** Owned vs total per generation, in generation order (label "Gen N"). */
export function statsByGeneration(entries: PokemonEntry[], owned: ReadonlySet<string>): StatRow[] {
  return [...rows(entries, owned, (e) => [String(e.generation)]).values()]
    .map((row) => ({ ...row, label: `Gen ${row.key}` }))
    .sort((a, b) => Number(a.key) - Number(b.key))
}

/** Owned vs total for a few useful slices: regional forms, final stage, gender variants, other alternate forms. */
export function statsByForm(entries: PokemonEntry[], owned: ReadonlySet<string>): StatRow[] {
  const slices: { key: string; label: string; test: (e: PokemonEntry) => boolean }[] = [
    { key: 'regional', label: 'Regional forms', test: (e) => e.isRegionalForm },
    { key: 'final', label: 'Final stage', test: (e) => e.evolutionStage === 'final' },
    { key: 'gender', label: 'Gender variants', test: (e) => e.isGenderVariant },
    { key: 'alternate', label: 'Other forms', test: (e) => e.isAlternateForm && !e.isRegionalForm && !e.isGenderVariant },
  ]
  return slices.map(({ key, label, test }) => {
    const matching = entries.filter(test)
    return { key, label, owned: matching.filter((e) => owned.has(e.slug)).length, total: matching.length }
  })
}

/** Where owned Pokémon came from. */
export type GameShare = { gameId: string | null; label: string; count: number }

const GAME_NAMES = new Map(GAMES.map((g) => [g.id, g.name]))

/**
 * Counts, per game, the owned Pokémon tagged with it across all lists ("Obtained from games"). A Pokémon tagged with
 * two games counts for both; owned Pokémon with no tag at all are grouped under `gameId: null`. Sorted by count.
 */
export function statsByGame(lists: PokemonList[]): GameShare[] {
  const tagsBySlug = new Map<string, Set<string>>()
  for (const list of lists) {
    for (const slug of list.ownedIds) if (!tagsBySlug.has(slug)) tagsBySlug.set(slug, new Set())
    for (const [slug, games] of Object.entries(list.ownedGames ?? {})) {
      const tags = tagsBySlug.get(slug) ?? new Set<string>()
      for (const game of games) tags.add(game)
      tagsBySlug.set(slug, tags)
    }
  }
  const counts = new Map<string | null, number>()
  for (const tags of tagsBySlug.values()) {
    if (tags.size === 0) counts.set(null, (counts.get(null) ?? 0) + 1)
    for (const game of tags) counts.set(game, (counts.get(game) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([gameId, count]) => ({ gameId, label: gameId === null ? 'No game tagged' : (GAME_NAMES.get(gameId) ?? gameId), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}
