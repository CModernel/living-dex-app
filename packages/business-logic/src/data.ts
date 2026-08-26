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
  sprites: { id: string; hasFemale: boolean; hasShinyFemale: boolean }
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

export type PokemonDataset = {
  count: number
  sprite: { baseUrl: string; variants: SpriteVariants }
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

export function clearDatasetCache(): void {
  cached = null
}
