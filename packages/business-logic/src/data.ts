export type PokemonEntry = {
  slug: string
  pokeapiSlug: string
  csvKeyword: string
  name: string
  species: string
  dex: string
  types: string[]
  generation: number
  regionalDex: Record<string, number>
  // `pokejungleId`/`pokejungleShinyId` are optional because the app can be running
  // against a dataset published before those fields existed — see
  // getPokeJungleSpriteUrl. `pokejungleShinyId` is additionally only ever set for the
  // handful of entries (Minior, Alcremie) whose shiny id differs from `pokejungleId` —
  // every other entry's shiny sprite lives at the same id as its normal one.
  //
  // `pokejungleShinyUnavailable` covers entries with NO shiny art on PokeJungle at
  // all (real 404s, or the site's own lock-icon image served with HTTP 200 — a
  // request that "succeeds" but isn't the sprite, so it can't be detected by an
  // <img onError> at runtime). Precomputed here rather than checked client-side.
  sprites: {
    id: string
    hasFemale: boolean
    hasShinyFemale: boolean
    pokejungleId?: string
    pokejungleShinyId?: string
    pokejungleShinyUnavailable?: boolean
  }
  evolutionStage: 'pre' | 'mid' | 'final'
  isAlternateForm: boolean
  isGenderVariant: boolean
  isRegionalForm: boolean
  region: string | null
  hasStatOrTypeDifference: boolean
  sortIndex: number
}

export type SpriteVariants = {
  front_default: string
  front_shiny: string
  front_female: string
  front_shiny_female: string
}

export type PokeJungleVariant = 'normal' | 'shiny'

export type PokemonDataset = {
  count: number
  sprite: {
    baseUrl: string
    variants: SpriteVariants
    // Optional for the same reason as `pokejungleId` above: older published datasets
    // only carry the top-level PokeAPI baseUrl/variants.
    sources?: {
      pokejungle?: { baseUrl: string; variants: Record<PokeJungleVariant, string> }
    }
  }
  pokemon: Record<string, PokemonEntry>
}

export const DATASET_URL =
  'https://cdn.jsdelivr.net/gh/CModernel/living-dex-organizer@main/data/v1/living-form-full-data.json'

let cached: PokemonDataset | null = null

export async function fetchDataset(): Promise<PokemonDataset> {
  if (cached) return cached
  const res = await fetch(DATASET_URL)
  if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`)
  cached = (await res.json()) as PokemonDataset
  return cached
}

export function getSpriteUrl(
  dataset: PokemonDataset,
  entry: PokemonEntry,
  variant: 'default' | 'shiny' | 'female' | 'shiny-female' = 'default',
): string | null {
  if (variant === 'female' && !entry.sprites.hasFemale) return null
  if (variant === 'shiny-female' && !entry.sprites.hasShinyFemale) return null

  const variantKeyMap: Record<typeof variant, keyof SpriteVariants> = {
    default: 'front_default',
    shiny: 'front_shiny',
    female: 'front_female',
    'shiny-female': 'front_shiny_female',
  }
  const variantKey = variantKeyMap[variant]
  const prefix = dataset.sprite.variants[variantKey]
  return `${dataset.sprite.baseUrl}${prefix}${entry.sprites.id}.png`
}

/**
 * PokeJungle sprite URL for an entry, or null if this dataset doesn't carry them.
 *
 * These are the sprites Austin John's own sheet uses, and the ones we render by
 * preference — getSpriteUrl (PokeAPI) stays as the fallback. Returning null rather
 * than throwing is deliberate: the dataset is fetched from a CDN, so the app can be
 * running against a copy published before `sources.pokejungle` existed, and it should
 * quietly keep showing PokeAPI sprites until the newer data propagates.
 *
 * Note PokeJungle's shiny coverage isn't total — the per-combination Alcremie and
 * Minior shinies 404 — so callers should still handle an image that fails to load.
 */
export function getPokeJungleSpriteUrl(
  dataset: PokemonDataset,
  entry: PokemonEntry,
  variant: PokeJungleVariant = 'normal',
): string | null {
  if (variant === 'shiny' && entry.sprites.pokejungleShinyUnavailable) return null

  const source = dataset.sprite.sources?.pokejungle
  const spriteId =
    variant === 'shiny'
      ? (entry.sprites.pokejungleShinyId ?? entry.sprites.pokejungleId)
      : entry.sprites.pokejungleId
  if (!source || !spriteId) return null
  return `${source.baseUrl}${source.variants[variant]}${spriteId}.png`
}

export function clearDatasetCache(): void {
  cached = null
}
