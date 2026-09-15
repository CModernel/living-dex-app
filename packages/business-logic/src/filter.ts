import type { PokemonEntry } from './data.js'
import type { ListFilter } from './types.js'

export function applyListFilter(
  base: (entry: PokemonEntry) => boolean,
  filter: ListFilter,
): (entry: PokemonEntry) => boolean {
  return (entry) => {
    if (!base(entry)) return false
    if (filter.finalStageOnly && entry.evolutionStage !== 'final') return false
    if (filter.regionalFormsOnly && entry.isAlternateForm && !entry.isRegionalForm) return false
    if (filter.hideGenderVariants && entry.isGenderVariant) return false
    return true
  }
}
