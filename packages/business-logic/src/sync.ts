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

// ---------------------------------------------------------------------------------------------------------------------
// 3.42 automatic sync: three-way merge against the last synced copy ("base"), so un-marking a Pokémon and deleting a
// list propagate, while additions made on two devices at once are both kept.
// ---------------------------------------------------------------------------------------------------------------------

/** A cloud row per list: the list, or `null` when it was deleted on some device (a tombstone). */
export type RemoteLists = Record<string, PokemonList | null>

// Stable JSON (sorted object keys) so equal lists compare equal whatever order their keys were written in.
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
    return `{${entries
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
const same = (a: unknown, b: unknown) => stable(a) === stable(b)

/** True when two lists hold the same content (owned order ignored). */
export function sameList(a: PokemonList | undefined | null, b: PokemonList | undefined | null): boolean {
  if (!a || !b) return a === b || (!a && !b)
  const norm = (l: PokemonList) => ({ ...l, ownedIds: [...l.ownedIds].sort() })
  return same(norm(a), norm(b))
}

/** True when every list matches (same ids, same content). */
export function sameLists(a: Record<string, PokemonList>, b: Record<string, PokemonList>): boolean {
  const ids = Object.keys(a)
  return ids.length === Object.keys(b).length && ids.every((id) => sameList(a[id], b[id]))
}

// Kept when both sides have it, or when the side that has it added it after the base.
const keep = (inL: boolean, inR: boolean, inB: boolean) => (inL && inR) || (inL && !inB) || (inR && !inB)

const SCALAR_FIELDS = ['name', 'icon', 'createdAt', 'dataVersion', 'variant', 'filter', 'settings', 'tier', 'layoutTier'] as const

/**
 * Three-way merge of one list. Owned Pokémon and game tags: an item stays if both sides have it or the side that has it
 * added it since `base` (so un-marking on one device wins over the other device simply still having it, and adds on
 * both devices are both kept). Name, tiers, filter and settings: the side that changed since `base` wins; when both
 * changed, this device (`local`) wins.
 */
export function mergeList3(base: PokemonList, local: PokemonList, remote: PokemonList): PokemonList {
  const B = new Set(base.ownedIds)
  const L = new Set(local.ownedIds)
  const R = new Set(remote.ownedIds)
  const owned = [...local.ownedIds, ...remote.ownedIds.filter((id) => !L.has(id))].filter((id) =>
    keep(L.has(id), R.has(id), B.has(id)),
  )

  const pairs = (games: Record<string, string[]> | undefined) =>
    new Set(Object.entries(games ?? {}).flatMap(([slug, ids]) => ids.map((g) => `${slug}\u0000${g}`)))
  const gB = pairs(base.ownedGames)
  const gL = pairs(local.ownedGames)
  const gR = pairs(remote.ownedGames)
  const ownedGames: Record<string, string[]> = {}
  for (const pair of new Set([...gL, ...gR])) {
    if (!keep(gL.has(pair), gR.has(pair), gB.has(pair))) continue
    const [slug, game] = pair.split('\u0000')
    ;(ownedGames[slug] ??= []).push(game)
  }
  for (const slug of Object.keys(ownedGames)) {
    ownedGames[slug].sort(byRelease)
    if (!owned.includes(slug)) owned.push(slug) // a tagged entry is always owned (owned.ts invariant)
  }

  const result: PokemonList = { ...local, ownedIds: owned }
  const target = result as Record<string, unknown>
  for (const field of SCALAR_FIELDS) {
    const value = same(local[field], base[field]) ? remote[field] : local[field]
    if (value === undefined) delete target[field]
    else target[field] = value
  }
  if (Object.keys(ownedGames).length) result.ownedGames = ownedGames
  else delete result.ownedGames
  return result
}

/**
 * Combines every list of this device, the cloud and the last synced copy. Returns the lists this device should keep and
 * the rows to write to the cloud (`null` = mark deleted). Deletions: a list deleted on one side and untouched on the
 * other is deleted; deleted on one side but edited on the other since `base`, it is kept (nothing is lost). Without a
 * base (first sync on a device) it falls back to the union merge of 3.41.
 */
export function syncLists(
  base: Record<string, PokemonList>,
  local: Record<string, PokemonList>,
  remote: RemoteLists,
): { lists: Record<string, PokemonList>; push: RemoteLists } {
  const lists: Record<string, PokemonList> = {}
  const ids = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])
  for (const id of ids) {
    const B = base[id]
    const L = local[id]
    const R = remote[id] // undefined = no row, null = tombstone
    let merged: PokemonList | null
    if (L && R) merged = B ? mergeList3(B, L, R) : mergeLists({ [id]: L }, [R])[id]
    else if (L) merged = R === null && B && sameList(L, B) ? null : L // deleted elsewhere, untouched here → delete
    else if (R) merged = B && sameList(R, B) ? null : R // deleted here: wins unless edited elsewhere since base
    else merged = null
    if (merged) lists[id] = merged
  }
  return { lists, push: rowsToPush(lists, remote) }
}

/** The cloud writes that make `cloud` match `lists`: changed or new lists, and tombstones for lists gone from `lists`. */
export function rowsToPush(lists: Record<string, PokemonList>, cloud: RemoteLists): RemoteLists {
  const push: RemoteLists = {}
  for (const [id, list] of Object.entries(lists)) if (!sameList(list, cloud[id])) push[id] = list
  for (const [id, row] of Object.entries(cloud)) if (row && !lists[id]) push[id] = null
  return push
}
