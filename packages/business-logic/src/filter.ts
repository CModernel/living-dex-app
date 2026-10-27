import { availableGames } from './availability.js'
import type { PokemonEntry } from './data.js'
import type { ListFilter } from './types.js'

/**
 * `selectedGameIds` only matters for `hideInaccessible`: an entry is inaccessible when it's
 * obtainable/conditional in none of them. Entries without availability data (older datasets)
 * are never hidden by it, since "no data" isn't "unobtainable".
 */
export function applyListFilter(
  base: (entry: PokemonEntry) => boolean,
  filter: ListFilter,
  selectedGameIds: readonly string[] = [],
): (entry: PokemonEntry) => boolean {
  return (entry) => {
    if (!base(entry)) return false
    if (filter.finalStageOnly && entry.evolutionStage !== 'final') return false
    if (filter.regionalFormsOnly && entry.isAlternateForm && !entry.isRegionalForm) return false
    if (filter.hideGenderVariants && entry.isGenderVariant) return false
    if (filter.hideInaccessible && entry.availability && availableGames(entry, selectedGameIds).length === 0) return false
    return true
  }
}
