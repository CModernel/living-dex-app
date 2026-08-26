// @cmodernel/living-dex-tiers ships no .d.ts (plain JS package) — ambient declaration
// mirroring living-dex-organizer/packages/tiers/index.js's actual shape.
declare module '@cmodernel/living-dex-tiers' {
  import type { PokemonEntry } from '@living-dex/business-logic'

  export type TierId = 'living-form' | 'living-lite' | 'final-form-full' | 'final-form'

  export const TIERS: Record<
    TierId,
    {
      csv: string
      predicate: (entry: PokemonEntry) => boolean
    }
  >

  export const KNOWN_DIVERGENCES: Record<string, string[]>
}
