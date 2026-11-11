import { TIERS } from '@cmodernel/living-dex-tiers'
import { TIER_IDS, tierSlugSets, type PokemonDataset, type TierId, type TierSlugSets } from '@living-dex/business-logic'
import { useMemo } from 'react'

// Trophy rank order: smallest / easiest tier first. Also the order the tier guide lists them in.
export const TROPHY_TIER_ORDER: TierId[] = ['final-form', 'final-form-full', 'living-lite', 'living-form', 'living-form-full']

export const TIER_LABELS: Record<TierId, string> = {
  'living-form-full': 'Living Form Full',
  'living-form': 'Living Form',
  'living-lite': 'Living Lite',
  'final-form-full': 'Final Form Full',
  'final-form': 'Final Form',
}

// Plain-language guide for people who don't know the community tier names (3.19). Wording mirrors the
// predicates in @cmodernel/living-dex-tiers; counts are always computed from the dataset, never written here.
export const TIER_INFO: Record<TierId, { summary: string; includes: string; skips: string }> = {
  'final-form': {
    summary: 'Only fully evolved Pokémon, one of each.',
    includes: 'Final evolutions and Pokémon that never evolve, plus regional forms.',
    skips: 'Earlier evolutions, cosmetic forms and gender differences.',
  },
  'final-form-full': {
    summary: 'Fully evolved Pokémon with their forms.',
    includes: 'Final evolutions with their alternate forms (patterns, flavours…).',
    skips: 'Earlier evolutions and gender differences.',
  },
  'living-lite': {
    summary: 'Every species once, a classic "Living Dex".',
    includes: 'Every evolution stage, plus regional forms.',
    skips: 'Cosmetic alternate forms and gender differences.',
  },
  'living-form': {
    summary: 'Every species and every form.',
    includes: 'Every evolution stage and every alternate form.',
    skips: 'Only gender differences.',
  },
  'living-form-full': {
    summary: 'Absolutely everything.',
    includes: 'Every species, every form and every gender difference.',
    skips: 'Nothing.',
  },
}

export const BEGINNER_TIP =
  'New to this? Start small with Final Form or Living Lite and choose "I\'ll grow it later": your boxes are planned for the bigger goal, so nothing has to move when you advance.'

const TIER_PREDICATES = Object.fromEntries(TIER_IDS.map((id) => [id, TIERS[id].predicate])) as Record<
  TierId,
  (typeof TIERS)[TierId]['predicate']
>

export function useTierSets(dataset: PokemonDataset | null): TierSlugSets | null {
  return useMemo(() => (dataset ? tierSlugSets(Object.values(dataset.pokemon), TIER_PREDICATES) : null), [dataset])
}
