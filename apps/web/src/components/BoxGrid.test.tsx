import type { PokemonDataset } from '@living-dex/business-logic'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import BoxGrid from './BoxGrid'

const entry = (slug: string, i: number) => ({ slug, name: `Mon ${slug}`, dex: `00${i}`, sortIndex: i, sprites: { id: String(i) } })
const slugs = Array.from({ length: 33 }, (_, i) => `m${i}`)
const dataset = {
  sprite: { baseUrl: 'https://x/', variants: { front_default: '' } },
  pokemon: Object.fromEntries(slugs.map((s, i) => [s, entry(s, i)])),
} as unknown as PokemonDataset
const boxes = [slugs.slice(0, 30), slugs.slice(30)]

function renderGrid(props: Partial<Parameters<typeof BoxGrid>[0]> = {}) {
  const onToggle = vi.fn()
  render(
    <BoxGrid
      dataset={dataset}
      boxes={boxes}
      inTier={new Set(slugs.filter((s) => s !== 'm1'))} // m1 is a reserved future slot
      visible={new Set(slugs.filter((s) => s !== 'm1' && s !== 'm2'))} // m2 hidden by a filter
      ownedIds={new Set(['m0', 'm31'])}
      showFuture={false}
      onToggle={onToggle}
      {...props}
    />,
  )
  return onToggle
}

test('one card per box, 30 positions each, with owned/total per box', () => {
  renderGrid()
  const box1 = screen.getByRole('region', { name: 'Box 1' })
  const box2 = screen.getByRole('region', { name: 'Box 2' })
  expect(within(box1).getByRole('heading')).toHaveTextContent('Box 11/29')
  expect(within(box2).getByRole('heading')).toHaveTextContent('Box 21/3')
  expect(box2.querySelector('.grid')!.children).toHaveLength(30)
})

test('tapping an active slot toggles owned; reserved and filtered slots are inert', () => {
  const onToggle = renderGrid()
  expect(screen.getByRole('button', { name: 'Mark Mon m0 as owned' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Mark Mon m3 as owned' }))
  expect(onToggle).toHaveBeenCalledWith('m3')
  expect(screen.queryByRole('button', { name: 'Mark Mon m1 as owned' })).not.toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Reserved slot' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Mon m2 (hidden by filters)' })).toBeInTheDocument()
})

test('"Show future slots" reveals the reserved Pokémon in grey', () => {
  renderGrid({ showFuture: true })
  const reserved = screen.getByRole('img', { name: 'Mon m1 (reserved for your planned goal)' })
  expect(reserved.querySelector('img')).not.toBeNull()
})
