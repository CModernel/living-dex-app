import type { PokemonEntry } from './data.js'

// Local trophies (TODO 3.14): computed from the collection's visible entries and its owned set,
// never stored, so there is no flag to drift out of sync.

export type Trophy = {
  id: string
  name: string
  description: string
  earned: boolean
  progress: { owned: number; total: number }
}

const MILESTONES = [25, 50, 75, 100] as const

function trophy(id: string, name: string, description: string, owned: number, total: number, needed: number): Trophy {
  return { id, name, description, earned: total > 0 && owned >= needed, progress: { owned, total } }
}

export function evaluateTrophies(entries: readonly PokemonEntry[], ownedIds: ReadonlySet<string>): Trophy[] {
  const total = entries.length
  const owned = entries.filter((e) => ownedIds.has(e.slug)).length
  const trophies: Trophy[] = MILESTONES.map((pct) =>
    trophy(`pct-${pct}`, `${pct}% complete`, `Own ${pct}% of this collection`, owned, total, Math.ceil((total * pct) / 100)),
  )

  const byGen = new Map<number, { owned: number; total: number }>()
  for (const e of entries) {
    const g = byGen.get(e.generation) ?? { owned: 0, total: 0 }
    g.total += 1
    if (ownedIds.has(e.slug)) g.owned += 1
    byGen.set(e.generation, g)
  }
  for (const gen of [...byGen.keys()].sort((a, b) => a - b)) {
    const g = byGen.get(gen)!
    trophies.push(trophy(`gen-${gen}`, `Generation ${gen}`, `Own every Generation ${gen} entry`, g.owned, g.total, g.total))
  }

  const regional = entries.filter((e) => e.isRegionalForm)
  if (regional.length > 0) {
    const regionalOwned = regional.filter((e) => ownedIds.has(e.slug)).length
    trophies.push(trophy('regional-forms', 'Regional forms', 'Own every regional form', regionalOwned, regional.length, regional.length))
  }

  return trophies
}
