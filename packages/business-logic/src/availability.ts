import type { PokemonEntry } from './data.js'

// Decoding half of living-dex-organizer's scripts/lib/availability.js (TODO 3.8d), ported
// because that file is CommonJS pipeline code outside any package. Keep the legend and game
// list in sync with it if the organizer adds codes or games.

export type AvailabilityCategory = 'obtainable' | 'conditional' | 'unobtainable'

// All codes are 1 or 2 characters. Case-sensitive: 'E', 'Ev' and 'EV' are three distinct codes.
export const SYMBOL_LEGEND: Record<string, AvailabilityCategory> = {
  C: 'obtainable',
  S: 'obtainable',
  R: 'obtainable',
  E: 'obtainable',
  B: 'obtainable',
  CD: 'obtainable',
  D: 'obtainable',
  DA: 'obtainable',
  ET: 'conditional',
  TE: 'conditional',
  CC: 'conditional',
  DS: 'conditional',
  FS: 'conditional',
  EV: 'conditional',
  PW: 'unobtainable',
  DR: 'unobtainable',
  DW: 'unobtainable',
  Ev: 'unobtainable',
  T: 'unobtainable',
  '—': 'unobtainable',
}

const CATEGORY_RANK: Record<AvailabilityCategory, number> = { obtainable: 0, conditional: 1, unobtainable: 2 }

export type AvailabilityCell = { tokens: string[]; category: AvailabilityCategory; footnote: boolean }

/**
 * Splits a raw cell (e.g. `RD`, `EvET`, `"EV *"`) into legend codes, preferring 2-char codes
 * over 1-char ones; the cell's category is the worst of its tokens. Unlike the organizer's
 * version this never throws: an unknown code makes the whole cell unobtainable, so a dataset
 * newer than this legend can't crash rendering.
 */
export function tokenizeAvailabilityCell(cell: string | undefined): AvailabilityCell {
  let raw = (cell ?? '').trim()
  if (raw === '' || raw === '—') return { tokens: [], category: 'unobtainable', footnote: false }

  const footnote = / \*$/.test(raw)
  if (footnote) raw = raw.slice(0, -2)

  const tokens: string[] = []
  let i = 0
  while (i < raw.length) {
    const two = raw.slice(i, i + 2)
    if (two.length === 2 && SYMBOL_LEGEND[two]) {
      tokens.push(two)
      i += 2
      continue
    }
    const one = raw[i]
    if (SYMBOL_LEGEND[one]) {
      tokens.push(one)
      i += 1
      continue
    }
    return { tokens, category: 'unobtainable', footnote }
  }

  const category = tokens.reduce<AvailabilityCategory>(
    (worst, t) => (CATEGORY_RANK[SYMBOL_LEGEND[t]] > CATEGORY_RANK[worst] ? SYMBOL_LEGEND[t] : worst),
    'obtainable',
  )
  return { tokens, category, footnote }
}

export type Game = { id: string; name: string }

// Release order, same as the organizer's GAME_COLUMNS.
export const GAMES: readonly Game[] = [
  { id: 'red', name: 'Red' },
  { id: 'green', name: 'Green' },
  { id: 'blue', name: 'Blue (Japanese)' },
  { id: 'yellow', name: 'Yellow' },
  { id: 'gold', name: 'Gold' },
  { id: 'silver', name: 'Silver' },
  { id: 'crystal', name: 'Crystal' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'sapphire', name: 'Sapphire' },
  { id: 'firered', name: 'FireRed' },
  { id: 'leafgreen', name: 'LeafGreen' },
  { id: 'emerald', name: 'Emerald' },
  { id: 'colosseum', name: 'Colosseum' },
  { id: 'xd', name: 'XD' },
  { id: 'diamond', name: 'Diamond' },
  { id: 'pearl', name: 'Pearl' },
  { id: 'platinum', name: 'Platinum' },
  { id: 'heartgold', name: 'HeartGold' },
  { id: 'soulsilver', name: 'SoulSilver' },
  { id: 'black', name: 'Black' },
  { id: 'white', name: 'White' },
  { id: 'black-2', name: 'Black 2' },
  { id: 'white-2', name: 'White 2' },
  { id: 'x', name: 'X' },
  { id: 'y', name: 'Y' },
  { id: 'omega-ruby', name: 'Omega Ruby' },
  { id: 'alpha-sapphire', name: 'Alpha Sapphire' },
  { id: 'sun', name: 'Sun' },
  { id: 'moon', name: 'Moon' },
  { id: 'ultra-sun', name: 'Ultra Sun' },
  { id: 'ultra-moon', name: 'Ultra Moon' },
  { id: 'lets-go-pikachu', name: "Let's Go, Pikachu!" },
  { id: 'lets-go-eevee', name: "Let's Go, Eevee!" },
  { id: 'sword', name: 'Sword' },
  { id: 'shield', name: 'Shield' },
  { id: 'brilliant-diamond', name: 'Brilliant Diamond' },
  { id: 'shining-pearl', name: 'Shining Pearl' },
  { id: 'legends-arceus', name: 'Legends: Arceus' },
  { id: 'scarlet', name: 'Scarlet' },
  { id: 'violet', name: 'Violet' },
  { id: 'legends-za', name: 'Legends: Z-A' },
]

/** Category of an entry in one game; a missing key in the sparse map means unobtainable. */
export function getAvailabilityCategory(entry: PokemonEntry, gameId: string): AvailabilityCategory {
  return tokenizeAvailabilityCell(entry.availability?.[gameId]).category
}

/** The given games (order kept) in which the entry is obtainable or conditional. */
export function availableGames(entry: PokemonEntry, gameIds: readonly string[]): string[] {
  return gameIds.filter((id) => getAvailabilityCategory(entry, id) !== 'unobtainable')
}

/** The ids of every game not in `excludedGameIds`, in release order. */
export function selectedGameIds(excludedGameIds: readonly string[]): string[] {
  const excluded = new Set(excludedGameIds)
  return GAMES.filter((g) => !excluded.has(g.id)).map((g) => g.id)
}
