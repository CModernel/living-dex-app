// @cmodernel/living-dex-tiers ships no .d.ts (plain JS package) — ambient declaration
// mirroring living-dex-organizer/packages/tiers/index.js's actual shape. Only used by
// filter.test.ts (dev dependency), not by any production code in this package.
declare module '@cmodernel/living-dex-tiers' {
  import type { PokemonEntry } from '../data.js'

  export type TierId = 'living-form' | 'living-lite' | 'final-form-full' | 'final-form' | 'living-form-full'

  export const TIERS: Record<
    TierId,
    {
      csv: string
      predicate: (entry: PokemonEntry) => boolean
    }
  >

  export const KNOWN_DIVERGENCES: Record<string, string[]>
}
