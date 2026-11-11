// Signature color + generation per game, for the colored chips in the game picker and the Filters
// menu. Official logos/box art are trademarks, so the app uses a color per game instead. Keyed by
// the ids in business-logic's GAMES; a test fails when a game is added without an entry here.
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
}

const FALLBACK = { color: '#888890', generation: 0 }

export function gameStyle(gameId: string) {
  return GAME_STYLE[gameId] ?? FALLBACK
}
