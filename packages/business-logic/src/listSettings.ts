import { DEFAULT_LIST_SETTINGS, type ListSettings, type PokemonList, type ResolvedListSettings } from './types.js'

/** A list's settings merged over the defaults (every key present). */
export function resolveListSettings(settings: ListSettings | undefined): ResolvedListSettings {
  const { grid, ...rest } = settings ?? {}
  const defaults = DEFAULT_LIST_SETTINGS
  return {
    ...defaults,
    ...rest,
    grid: {
      showFutureSlots: grid?.showFutureSlots ?? defaults.grid.showFutureSlots,
      filter: { ...defaults.grid.filter, ...grid?.filter },
    },
  }
}

// Preference keys that moved to the list in 3.36.
const LEGACY_KEYS = ['viewMode', 'showFutureSlots', 'excludedGameIds'] as const

/** Deep copy (the excluded-games array must not be shared between lists). */
export function copySettings(settings: ListSettings): ListSettings {
  return {
    ...settings,
    ...(settings.excludedGameIds ? { excludedGameIds: [...settings.excludedGameIds] } : {}),
    ...(settings.grid ? { grid: { ...settings.grid, ...(settings.grid.filter ? { filter: { ...settings.grid.filter } } : {}) } } : {}),
  }
}

type Loose = { lists?: Record<string, PokemonList>; preferences?: Record<string, unknown> } & Record<string, unknown>

/**
 * 3.36 one-time migration on loaded state: the user-level `viewMode`, `showFutureSlots` and `excludedGameIds`
 * become each existing list's own `settings` (lists that already have settings keep them), then the legacy keys
 * are dropped from the preferences. Idempotent, and it never touches `ownedIds` / `ownedGames`.
 */
export function migrateListSettings<T extends Loose>(state: T): T {
  const prefs = state.preferences
  if (!prefs || !LEGACY_KEYS.some((key) => key in prefs)) return state

  const legacy: ListSettings = {}
  if (prefs.viewMode === 'table' || prefs.viewMode === 'grid') legacy.viewMode = prefs.viewMode
  if (typeof prefs.showFutureSlots === 'boolean') legacy.showFutureSlots = prefs.showFutureSlots
  if (Array.isArray(prefs.excludedGameIds)) legacy.excludedGameIds = prefs.excludedGameIds as string[]

  const lists = Object.fromEntries(
    Object.entries(state.lists ?? {}).map(([id, list]) => [
      id,
      list.settings ? list : { ...list, settings: copySettings(legacy) },
    ]),
  )
  const preferences = Object.fromEntries(Object.entries(prefs).filter(([key]) => !(LEGACY_KEYS as readonly string[]).includes(key)))
  return { ...state, lists, preferences }
}
