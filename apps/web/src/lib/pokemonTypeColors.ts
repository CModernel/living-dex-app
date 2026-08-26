// Standard Pokémon type colors, widely used across fan sites/apps (no bundled icon assets
// needed — a colored badge with the type name is enough for at-a-glance scanning, and avoids
// adding another external image dependency for now). Real icon graphics matching a specific
// app's asset set can replace this later if desired — see TODO.md.
export const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  electric: '#f8d030',
  grass: '#78c850',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
}

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#68a090'
}
