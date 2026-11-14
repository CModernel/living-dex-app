import { getPokeJungleSpriteUrl, getSpriteUrl, type PokemonDataset, type PokemonEntry } from '@living-dex/business-logic'
import { createContext, useContext, useState } from 'react'

// 3.70: the list's "Show shiny" setting, provided once by HomePage so rows and tiles (memoised) pick it up through
// context instead of threading a prop through every column definition.
export const ShinyContext = createContext(false)

// Prefers PokeJungle (the sprites Austin John's own sheet uses) and falls back to PokeAPI. The fallback isn't just
// belt-and-braces: PokeJungle has no shiny art for the per-combination Alcremie/Minior forms, and a dataset
// published before `pokejungleId` existed returns null here. Shared by the table's Sprite and the grid (3.18).
export function useSpriteSource(dataset: PokemonDataset, entry: PokemonEntry) {
  const shiny = useContext(ShinyContext)
  const pokeApiUrl = getSpriteUrl(dataset, entry, shiny ? 'shiny' : 'default')
  const pokeJungleUrl = getPokeJungleSpriteUrl(dataset, entry, shiny ? 'shiny' : 'normal')
  // Records WHICH url failed rather than a bare flag: re-rendered rows/tiles can show a different entry in the same
  // instance, and a boolean would strand that new entry on the fallback.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const usePokeJungle = pokeJungleUrl !== null && failedUrl !== pokeJungleUrl
  const src = (usePokeJungle ? pokeJungleUrl : pokeApiUrl) ?? undefined
  // Re-setting the same value is a no-op, so a fallback that also 404s just stops here instead of looping.
  const onError = usePokeJungle ? () => setFailedUrl(pokeJungleUrl) : undefined
  return { src, onError }
}
