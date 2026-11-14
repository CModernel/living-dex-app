import { isTierId } from './layout.js'
import { DEFAULT_LIST_FILTER, type GridSettings, type ListFilter, type ListSettings, type PokemonList, type UserState } from './types.js'

// Export/import (TODO 3.9). Export is the whole state; import only ever ADDS collections (fresh
// ids, never overwrites), so preferences in a file are kept for backup but not applied.

const APP = 'living-dex'
const VERSION = 1

export type ImportResult = { ok: true; lists: PokemonList[] } | { ok: false; error: string }

export function serializeExport(state: UserState, now: Date = new Date()): string {
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: now.toISOString(), state }, null, 2)
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseList(raw: unknown): PokemonList | null {
  if (!isRecord(raw)) return null
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || !isStringArray(raw.ownedIds)) return null

  const ownedIds = [...raw.ownedIds]
  let ownedGames: Record<string, string[]> | undefined
  if (raw.ownedGames !== undefined) {
    if (!isRecord(raw.ownedGames)) return null
    ownedGames = {}
    for (const [slug, games] of Object.entries(raw.ownedGames)) {
      if (!isStringArray(games)) return null
      if (games.length === 0) continue
      ownedGames[slug] = [...games]
      // 3.7b invariant: a tagged slug is always owned.
      if (!ownedIds.includes(slug)) ownedIds.push(slug)
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    dataVersion: 'v1',
    variant: raw.variant === 'shiny' ? 'shiny' : 'normal',
    filter: { ...DEFAULT_LIST_FILTER, ...(isRecord(raw.filter) ? raw.filter : {}) },
    ownedIds,
    ownedGames,
    ...(parseSettings(raw.settings) ? { settings: parseSettings(raw.settings) } : {}),
    // 3.19: only known tier ids survive; the keys are omitted otherwise so the list resolves to the default.
    ...(isTierId(raw.tier) ? { tier: raw.tier } : {}),
    ...(isTierId(raw.layoutTier) ? { layoutTier: raw.layoutTier } : {}),
  }
}

// 3.36: keeps only well-typed keys; undefined when nothing valid remains (the list then uses the defaults).
function parseSettings(raw: unknown): ListSettings | undefined {
  if (!isRecord(raw)) return undefined
  const settings: ListSettings = {}
  if (raw.viewMode === 'table' || raw.viewMode === 'grid') settings.viewMode = raw.viewMode
  if (typeof raw.showFutureSlots === 'boolean') settings.showFutureSlots = raw.showFutureSlots
  if (typeof raw.showShiny === 'boolean') settings.showShiny = raw.showShiny
  if (isStringArray(raw.excludedGameIds)) settings.excludedGameIds = [...raw.excludedGameIds]
  if (isRecord(raw.grid)) {
    const grid: GridSettings = {}
    if (typeof raw.grid.showFutureSlots === 'boolean') grid.showFutureSlots = raw.grid.showFutureSlots
    if (isRecord(raw.grid.filter)) {
      const filter: Partial<ListFilter> = {}
      for (const key of Object.keys(DEFAULT_LIST_FILTER) as (keyof ListFilter)[]) {
        if (typeof raw.grid.filter[key] === 'boolean') filter[key] = raw.grid.filter[key] as boolean
      }
      if (Object.keys(filter).length) grid.filter = filter
    }
    if (Object.keys(grid).length) settings.grid = grid
  }
  return Object.keys(settings).length ? settings : undefined
}

export function parseImport(text: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' }
  }
  if (!isRecord(data) || data.app !== APP) return { ok: false, error: 'This is not a Living Dex export file.' }
  if (typeof data.version !== 'number' || data.version > VERSION) {
    return { ok: false, error: 'This file was made by a newer version of the app.' }
  }
  if (!isRecord(data.state) || !isRecord(data.state.lists)) return { ok: false, error: 'The file has no collections.' }

  const lists: PokemonList[] = []
  for (const raw of Object.values(data.state.lists)) {
    const list = parseList(raw)
    if (!list) return { ok: false, error: 'The file contains a malformed collection.' }
    lists.push(list)
  }
  return { ok: true, lists }
}

export function mergeImportedLists(
  existing: Record<string, PokemonList>,
  imported: readonly PokemonList[],
  newId: () => string,
  now: Date = new Date(),
): Record<string, PokemonList> {
  const result = { ...existing }
  const names = new Set(Object.values(existing).map((l) => l.name))
  for (const list of imported) {
    let name = list.name
    if (names.has(name)) {
      name = `${list.name} (imported)`
      for (let n = 2; names.has(name); n++) name = `${list.name} (imported ${n})`
    }
    names.add(name)
    const id = newId()
    result[id] = { ...list, id, name, createdAt: now.toISOString() }
  }
  return result
}
