// Signature color + generation per game, for the colored chips in the game picker and the Filters
// menu. Official logos/box art are trademarks, so the app uses a color per game instead. Keyed by
// the ids in business-logic's GAMES; a test fails when a game is added without an entry here.
/** Pseudo-generation for games outside the core series (Pokémon GO), shown as a "Mobile" group. */
export const MOBILE_GROUP = 99

export const GAME_STYLE: Record<string, { color: string; generation: number }> = {
  red: { color: '#E3350D', generation: 1 },
  green: { color: '#3BA55D', generation: 1 },
  blue: { color: '#2F5BD6', generation: 1 },
  yellow: { color: '#F2C417', generation: 1 },
  gold: { color: '#D4A017', generation: 2 },
  silver: { color: '#A9B2BC', generation: 2 },
  crystal: { color: '#6FC3E0', generation: 2 },
  ruby: { color: '#B5242C', generation: 3 },
  sapphire: { color: '#2A55A8', generation: 3 },
  firered: { color: '#E8541A', generation: 3 },
  leafgreen: { color: '#5BAE3C', generation: 3 },
  emerald: { color: '#2E9E5A', generation: 3 },
  colosseum: { color: '#7A4B2A', generation: 3 },
  xd: { color: '#5B3FA0', generation: 3 },
  diamond: { color: '#7FA6D9', generation: 4 },
  pearl: { color: '#E3B6C8', generation: 4 },
  platinum: { color: '#8F98A3', generation: 4 },
  heartgold: { color: '#E0A82E', generation: 4 },
  soulsilver: { color: '#B9C2CC', generation: 4 },
  black: { color: '#2B2B2B', generation: 5 },
  white: { color: '#E9E9E9', generation: 5 },
  'black-2': { color: '#1F6F8B', generation: 5 },
  'white-2': { color: '#D87C5A', generation: 5 },
  x: { color: '#2457A6', generation: 6 },
  y: { color: '#C8374B', generation: 6 },
  'omega-ruby': { color: '#D6452B', generation: 6 },
  'alpha-sapphire': { color: '#2F6FCB', generation: 6 },
  sun: { color: '#F28C28', generation: 7 },
  moon: { color: '#5B4BA8', generation: 7 },
  'ultra-sun': { color: '#E86A1B', generation: 7 },
  'ultra-moon': { color: '#3E358F', generation: 7 },
  'lets-go-pikachu': { color: '#F5C000', generation: 8 },
  'lets-go-eevee': { color: '#B5762F', generation: 8 },
  sword: { color: '#4DB5E6', generation: 8 },
  shield: { color: '#D13B5B', generation: 8 },
  'brilliant-diamond': { color: '#6C93E6', generation: 8 },
  'shining-pearl': { color: '#F0A9C4', generation: 8 },
  'legends-arceus': { color: '#7C8C99', generation: 8 },
  scarlet: { color: '#E8472B', generation: 9 },
  violet: { color: '#7A3FB5', generation: 9 },
  'legends-za': { color: '#2E8F8A', generation: 9 },
  // Not a core-series generation: its own "Mobile" group after Gen 9 (see GameChips).
  go: { color: '#1FA7A0', generation: MOBILE_GROUP },
}

const FALLBACK = { color: '#888890', generation: 0 }

export function gameStyle(gameId: string) {
  return GAME_STYLE[gameId] ?? FALLBACK
}

// 3.38: short badge text per game (unique, 1–2 letters) shown inside the colored circle; the full name stays in the
// tooltip/accessible name. A test fails when a game is added without a code here.
export const GAME_CODE: Record<string, string> = {
  red: 'R', green: 'Gr', blue: 'B', yellow: 'Ye', gold: 'Go', silver: 'Si', crystal: 'C',
  ruby: 'Ru', sapphire: 'Sa', firered: 'FR', leafgreen: 'LG', emerald: 'E', colosseum: 'Co', xd: 'XD',
  diamond: 'D', pearl: 'P', platinum: 'Pt', heartgold: 'HG', soulsilver: 'SS',
  black: 'Bk', white: 'W', 'black-2': 'B2', 'white-2': 'W2',
  x: 'X', y: 'Y', 'omega-ruby': 'OR', 'alpha-sapphire': 'AS',
  sun: 'Su', moon: 'M', 'ultra-sun': 'US', 'ultra-moon': 'UM',
  'lets-go-pikachu': 'LP', 'lets-go-eevee': 'LE', sword: 'Sw', shield: 'Sh',
  'brilliant-diamond': 'BD', 'shining-pearl': 'SP', 'legends-arceus': 'LA',
  scarlet: 'Sc', violet: 'V', 'legends-za': 'LZ', go: 'GO',
}

export function gameCode(gameId: string): string {
  return GAME_CODE[gameId] ?? gameId.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase()
}

/** Readable text color (black or white) on a badge background, by perceived luminance. */
export function badgeTextColor(hex: string): '#111111' | '#FFFFFF' {
  const n = parseInt(hex.slice(1), 16)
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luminance > 0.6 ? '#111111' : '#FFFFFF'
}
