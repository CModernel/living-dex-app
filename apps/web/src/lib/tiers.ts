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

// 3.19b tier picker: neutral tiles, a lightly tinted icon each, badges on three tiers only (user's choice).
export const TIER_ICON: Record<TierId, { glyph: string; tint: string }> = {
  'final-form': { glyph: '🏁', tint: 'bg-sky-500/10' },
  'final-form-full': { glyph: '🎨', tint: 'bg-pink-500/10' },
  'living-lite': { glyph: '📖', tint: 'bg-orange-500/10' },
  'living-form': { glyph: '📚', tint: 'bg-violet-500/10' },
  'living-form-full': { glyph: '👑', tint: 'bg-emerald-500/10' },
}

export const TIER_BADGE: Partial<Record<TierId, { label: string; className: string }>> = {
  'final-form': { label: 'Quickest goal', className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200' },
  'living-lite': { label: 'Classic', className: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200' },
  'living-form-full': { label: 'Everything', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' },
}

export const WHY_PLAN =
  'Box and Slot tell you where each Pokémon goes in your storage boxes. If you later grow into a bigger goal without a plan, every Box/Slot shifts and you have to re-sort your boxes. Planning now reserves the slots, so nothing ever has to move.'

const TIER_PREDICATES = Object.fromEntries(TIER_IDS.map((id) => [id, TIERS[id].predicate])) as Record<
  TierId,
  (typeof TIERS)[TierId]['predicate']
>

export function useTierSets(dataset: PokemonDataset | null): TierSlugSets | null {
  return useMemo(() => (dataset ? tierSlugSets(Object.values(dataset.pokemon), TIER_PREDICATES) : null), [dataset])
}
