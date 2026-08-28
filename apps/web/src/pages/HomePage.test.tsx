import { clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import HomePage from './HomePage'

const mockDataset: PokemonDataset = {
  count: 3,
  sprite: {
    baseUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/',
    variants: { front_default: '', front_shiny: 'shiny/', front_female: 'female/', front_shiny_female: 'shiny/female/' },
    sources: {
      pokejungle: {
        baseUrl: 'https://pokejungle.net/sprites/',
        variants: { normal: 'normal/', shiny: 'shiny/' },
      },
    },
  },
  pokemon: {
    bulbasaur: {
      slug: 'bulbasaur',
      pokeapiSlug: 'bulbasaur',
      csvKeyword: 'bulbasaur',
      name: 'Bulbasaur',
      species: 'Bulbasaur',
      dex: '0001',
      types: ['grass', 'poison'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '1', hasFemale: false, hasShinyFemale: false, pokejungleId: '0001' },
      evolutionStage: 'pre',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 0,
    },
    // isGenderVariant entries are excluded by the living-form tier predicate — this
    // fixture entry should never render as a row.
    pikachuFemale: {
      slug: 'pikachu-female',
      pokeapiSlug: 'pikachu',
      csvKeyword: 'pikachu-f',
      name: 'Pikachu (female)',
      species: 'Pikachu',
      dex: '0025',
      types: ['electric'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '25', hasFemale: true, hasShinyFemale: false, pokejungleId: '0025-f' },
      evolutionStage: 'mid',
      isAlternateForm: false,
      isGenderVariant: true,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 1,
    },
    // Only entry with evolutionStage: 'final' — used to verify the tier selector: it's the
    // only fixture entry that survives filtering down to the "Final Form" tier.
    charizard: {
      slug: 'charizard',
      pokeapiSlug: 'charizard',
      csvKeyword: 'charizard',
      name: 'Charizard',
      species: 'Charizard',
      dex: '0006',
      types: ['fire', 'flying'],
      generation: 1,
      regionalDex: {},
      sprites: { id: '6', hasFemale: false, hasShinyFemale: false, pokejungleId: '0006' },
      evolutionStage: 'final',
      isAlternateForm: false,
      isGenderVariant: false,
      isRegionalForm: false,
      region: null,
      hasStatOrTypeDifference: false,
      sortIndex: 2,
    },
  },
}

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
  window.localStorage.clear()
})

afterEach(() => {
  global.fetch = originalFetch
  clearDatasetCache()
  window.localStorage.clear()
})

function renderHomePage() {
  return render(
    <UserStateProvider>
      <HomePage />
    </UserStateProvider>,
  )
}

test('shows a loading state before the dataset resolves', () => {
  global.fetch = vi.fn(() => new Promise(() => {}))
  renderHomePage()
  expect(screen.getByText(/loading pokémon data/i)).toBeInTheDocument()
})

test('shows an error message when the dataset fails to load', async () => {
  global.fetch = vi.fn(async () => ({ ok: false, status: 500 }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText(/failed to load dataset/i)).toBeInTheDocument())
})

test('renders one row per living-form entry, applying the tier predicate', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  // The gender-variant entry is filtered out by the living-form tier predicate.
  expect(screen.queryByText('Pikachu (female)')).not.toBeInTheDocument()
})

test('switching the tier selector changes which rows render', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/tier/i), { target: { value: 'final-form' } })

  // Bulbasaur (evolutionStage: 'pre') doesn't survive the Final Form predicate; Charizard
  // (evolutionStage: 'final') does.
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()
})

test('toggling the owned checkbox persists to the active list', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).not.toBeChecked()

  // Query and click in the same statement rather than holding a reference across an await —
  // an in-flight effect (e.g. the active-list auto-create) can re-render and replace this
  // node between an earlier `await` and the click, leaving a stale/detached element that
  // silently swallows the click.
  fireEvent.click(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i }))

  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked()
  })
  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    const lists = Object.values(stored.lists ?? {}) as { ownedIds: string[] }[]
    expect(lists[0]?.ownedIds).toContain('bulbasaur')
  })
})

test('clicking anywhere in the row toggles owned, not just the checkbox', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  const checkbox = await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  expect(checkbox).not.toBeChecked()

  fireEvent.click(screen.getByText('Bulbasaur'))

  await waitFor(() => {
    // Re-query rather than reuse the earlier reference: TanStack Table's row/cell rendering
    // recreates cell elements on state changes, so a captured DOM node can go stale.
    const updated = screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })
    expect(updated).toBeChecked()
  })
})

test('clicking the checkbox directly does not double-toggle via the row handler', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  // Query and click in the same statement — see the "persists" test above for why.
  fireEvent.click(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i }))

  // If the click bubbled to the row's own toggle handler too, this would already be unchecked
  // again by the time this resolves.
  await waitFor(() => {
    expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked()
  })
})

test('optional columns are hidden by default', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.queryByText('0001')).not.toBeInTheDocument()
})

test('toggling a column in the menu shows and hides it', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const dexCheckbox = screen.getByRole('checkbox', { name: 'Dex #' })
  expect(dexCheckbox).not.toBeChecked()

  fireEvent.click(dexCheckbox)
  await waitFor(() => expect(screen.getByText('0001')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('checkbox', { name: 'Dex #' }))
  await waitFor(() => expect(screen.queryByText('0001')).not.toBeInTheDocument())
})

test('column visibility survives a reload (3.5 — persisted, not just in-session state)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  const { unmount } = renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox', { name: 'Dex #' }))
  await waitFor(() => expect(screen.getByText('0001')).toBeInTheDocument())

  // Simulates a reload: a brand new HomePage/UserStateProvider instance, reading
  // whatever localStorage the unmounted instance left behind.
  unmount()
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('0001')).toBeInTheDocument()
})

test('always-visible columns are not offered in the column menu', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  expect(screen.queryByRole('checkbox', { name: 'Name' })).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: 'Types' })).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox', { name: 'Owned' })).not.toBeInTheDocument()
})

test('sprites render from PokeJungle when the dataset provides them', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  const { container } = renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  expect(container.querySelector('img')).toHaveAttribute(
    'src',
    'https://pokejungle.net/sprites/normal/0001.png',
  )
})

test('a sprite that fails to load falls back to the PokeAPI url', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  const { container } = renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // PokeJungle has no shiny art for the per-combination Alcremie/Minior forms, so a
  // missing image is an expected state rather than a bug — it must degrade, not break.
  fireEvent.error(container.querySelectorAll('img')[0])

  await waitFor(() => {
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    )
  })
})

test('switching the active list (via HomePage\'s own sidebar) changes which ownedIds the table reads and writes (3.6)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  // UserStateProvider hydrates from storage asynchronously; mutating before that resolves
  // can get silently clobbered back to defaults once it does (see 3.5's useDarkMode.test.ts
  // for the same guard, and TODO.md for why this is left as-is for now).
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  // Owning Bulbasaur creates the default first list ("My Living Dex") implicitly, same as
  // every other test in this file.
  await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  fireEvent.click(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())

  // Create a second list right from HomePage's own sidebar (ListSwitcher) — no navigation
  // to /lists needed, per the follow-up request that switching refresh the table in place.
  fireEvent.change(screen.getByLabelText(/new list name/i), { target: { value: 'List B' } })
  fireEvent.click(screen.getByRole('button', { name: /create list/i }))

  // A fresh list has nothing owned, even though the same Bulbasaur row is showing.
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).not.toBeChecked())

  // Switching back to the original list (clicking its row in the sidebar, same as
  // ListsPage.test.tsx's convention) shows the earlier toggle survived.
  fireEvent.click(screen.getByText('My Living Dex'))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())
})
