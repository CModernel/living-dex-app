import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

test('a drawn diagram beside the sizes, and one panel for the selected tier with example names', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => dataset }) as Response)
  render(<TiersPage />)
  const overview = screen.getByRole('region', { name: 'Overview' })
  expect(await within(overview).findByText('3 · 1 boxes')).toBeInTheDocument()
  const venn = within(overview).getByRole('group', { name: 'Which tier contains which' })
  expect(venn.querySelectorAll('circle')).toHaveLength(5)

  const panel = screen.getByRole('region', { name: 'Selected tier' })
  expect(within(panel).getByRole('heading')).toHaveTextContent('Final Form')

  fireEvent.click(within(venn).getByRole('button', { name: 'Living Form Full circle' }))
  expect(within(panel).getByRole('heading')).toHaveTextContent('Living Form Full')
  expect(within(panel).getByText(/Adds over Living Form:/).closest('p')).toHaveTextContent('Adds over Living Form: G…')

  fireEvent.click(within(overview).getByRole('button', { name: /^Living Lite\d/ }))
  expect(within(panel).getByText(/Adds over Final Form Full:/).closest('p')).toHaveTextContent('A…')
})
