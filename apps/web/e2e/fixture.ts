import { expect, type Page } from '@playwright/test'

// A small synthetic dataset (same shape as the published one) so UI tests don't hit the network.
function entry(i: number) {
  const slug = `mon-${i}`
  return {
    slug,
    pokeapiSlug: slug,
    csvKeyword: slug,
    name: `Mon ${i}`,
    species: `Mon ${i}`,
    dex: String(i).padStart(4, '0'),
    types: i % 2 ? ['grass', 'poison'] : ['fire'],
    generation: i <= 14 ? 1 : i <= 28 ? 2 : 3,
    regionalDex: {},
    sprites: { id: String(i), hasFemale: false, hasShinyFemale: false, pokejungleId: String(i).padStart(4, '0') },
    evolutionStage: (['pre', 'mid', 'final'] as const)[i % 3],
    isAlternateForm: false,
    isGenderVariant: false,
    isRegionalForm: i % 10 === 0,
    region: null,
    hasStatOrTypeDifference: false,
    sortIndex: i,
    // Obtainable in a few games so the "obtained from" picker has options (C = catchable).
    availability: { red: 'C', blue: 'C', gold: 'C', scarlet: 'C' },
  }
}

export const dataset = {
  count: 40,
  sprite: {
    baseUrl: 'https://example.invalid/sprites/',
    variants: { front_default: '', front_shiny: 'shiny/', front_female: 'female/', front_shiny_female: 'shiny/female/' },
    sources: { pokejungle: { baseUrl: 'https://example.invalid/pj/', variants: { normal: 'normal/', shiny: 'shiny/' } } },
  },
  pokemon: Object.fromEntries(Array.from({ length: 40 }, (_, k) => [`mon-${k + 1}`, entry(k + 1)])),
}

// Serves the fixture instead of the CDN dataset, and drops image requests.
export async function mockNetwork(page: Page) {
  await page.route('**/living-form-full-data.json*', (route) => route.fulfill({ json: dataset }))
  await page.route(/\.(png|gif|webp)(\?.*)?$/, (route) => route.abort())
}

// 3.19: a new user has no list until the start wizard creates one. With this fixture every Living
// tier is the same 40 entries, so Living Form has nothing bigger and the wizard creates it in one step.
export async function startList(page: Page, name = 'My Living Dex') {
  await page.getByRole('region', { name: 'Get started' }).getByRole('button', { name: 'Start' }).click()
  const wizard = page.getByRole('dialog', { name: 'Start a new list' })
  await wizard.getByLabel('New list name').fill(name)
  await wizard.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Mon 1', { exact: true })).toBeVisible()
}
