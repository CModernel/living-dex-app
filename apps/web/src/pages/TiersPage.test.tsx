import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { render, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import TiersPage from './TiersPage'

const entry = (slug: string, i: number, extra: Record<string, unknown> = {}) => ({
  slug, csvKeyword: slug, name: slug.toUpperCase(), dex: `000${i}`, sortIndex: i, generation: 1,
  evolutionStage: 'final', isAlternateForm: false, isGenderVariant: false, isRegionalForm: false, ...extra,
})
const dataset = {
  count: 3,
  pokemon: {
    a: entry('a', 0, { evolutionStage: 'pre' }),
    b: entry('b', 1),
    g: entry('g', 2, { isGenderVariant: true }),
  },
} as unknown as PokemonDataset

afterEach(() => clearDatasetCache())

test('explains which tier contains which, sizes and example names per tier', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => dataset }) as Response)
  render(<TiersPage />)
  const sizes = screen.getByRole('region', { name: 'Tier sizes' })
  expect(await within(sizes).findByText('3 · 1 boxes')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Which tier contains which' })).toHaveTextContent('not completely inside Living Lite')
  const full = screen.getByRole('article', { name: 'Living Form Full' })
  expect(within(full).getByText(/Adds over Living Form:/).closest('p')).toHaveTextContent('Adds over Living Form: G…')
  const lite = screen.getByRole('article', { name: 'Living Lite' })
  expect(within(lite).getByText(/Adds over Final Form Full:/).closest('p')).toHaveTextContent('Adds over Final Form Full: A…')
})
