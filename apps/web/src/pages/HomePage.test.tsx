import { DEFAULT_USER_STATE, clearDatasetCache, type PokemonDataset } from '@living-dex/business-logic'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import HomePage from './HomePage'
import { seedDefaultList, seedState, testList } from '../test/seed'

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

// Most tests below predate the 2026-11-12 default layout (Types/Box/Slot hidden, Dex beside the
// sprite) and exercise those columns, so they start from the "classic" layout. Tests of the new
// defaults call `window.localStorage.clear()` first.
function seedClassicLayout() {
  window.localStorage.setItem(
    'living-dex:user-state',
    JSON.stringify({
      ...DEFAULT_USER_STATE,
      // 3.19: lists come from the start wizard; tests start with one seeded list.
      lists: { seed: testList('seed', 'My Living Dex') },
      activeListId: 'seed',
      preferences: {
        ...DEFAULT_USER_STATE.preferences,
        visibleColumns: ['types', 'dex', 'box', 'slot'],
        columnOrder: ['sprite', 'name', 'species', 'types', 'dex', 'box', 'slot', 'position', 'generation', 'region', 'availability', 'evolutionStage', 'owned'],
      },
    }),
  )
}

beforeEach(() => {
  originalFetch = global.fetch
  clearDatasetCache()
  window.localStorage.clear()
  seedClassicLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
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

// jsdom performs no real layout, so the pointer-drag's hit-testing (comparing clientX against
// each header's getBoundingClientRect()) needs a stub — assigns each header a distinct 100px
// slot in on-screen (definition) order, matching how a real browser would lay them out.
function stubHeaderLayout() {
  screen.getAllByRole('columnheader').forEach((th, i) => {
    th.getBoundingClientRect = () =>
      ({ left: i * 100, right: i * 100 + 100, top: 0, bottom: 30, width: 100, height: 30, x: i * 100, y: 0, toJSON: () => {} }) as DOMRect
  })
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

test('only Dex is visible by default, right after the sprite; Types, Box, Slot and the rest start hidden', async () => {
  window.localStorage.clear()
  seedDefaultList()
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('0001')).toBeInTheDocument()
  expect(screen.queryByText(/^pre$/i)).not.toBeInTheDocument()
  const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.replace(/[⠿▲▼]/g, '').trim())
  expect(headers).toEqual(['Sprite', 'Dex', 'Name', 'Owned'])
  expect(screen.queryByText('grass')).not.toBeInTheDocument()
})

test('toggling a column in the menu shows and hides it', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const stageCheckbox = screen.getByRole('checkbox', { name: 'Stage' })
  expect(stageCheckbox).not.toBeChecked()

  fireEvent.click(stageCheckbox)
  await waitFor(() => expect(screen.getByText(/^pre$/i)).toBeInTheDocument())

  fireEvent.click(screen.getByRole('checkbox', { name: 'Stage' }))
  await waitFor(() => expect(screen.queryByText(/^pre$/i)).not.toBeInTheDocument())
})

test('column visibility survives a reload (3.5 — persisted, not just in-session state)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  const { unmount } = renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox', { name: 'Stage' }))
  await waitFor(() => expect(screen.getByText(/^pre$/i)).toBeInTheDocument())

  // Simulates a reload: a brand new HomePage/UserStateProvider instance, reading
  // whatever localStorage the unmounted instance left behind.
  unmount()
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText(/^pre$/i)).toBeInTheDocument()
})

test('always-visible columns are not offered in the column menu; Types is now hideable', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  expect(screen.queryByRole('checkbox', { name: 'Name' })).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Types' })).toBeInTheDocument()
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
  seedState([testList('seed', 'My Living Dex'), testList('list-b', 'List B')])
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  // UserStateProvider hydrates from storage asynchronously; mutating before that resolves
  // can get silently clobbered back to defaults once it does (see 3.5's useDarkMode.test.ts
  // for the same guard, and TODO.md for why this is left as-is for now).
  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())

  await screen.findByRole('checkbox', { name: /mark bulbasaur as owned/i })
  fireEvent.click(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())

  // Switch to the second list right from HomePage's own sidebar (ListSwitcher) — no navigation
  // to /lists needed, per the follow-up request that switching refresh the table in place.
  fireEvent.click(screen.getByText('List B'))

  // A fresh list has nothing owned, even though the same Bulbasaur row is showing.
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).not.toBeChecked())

  // Switching back to the original list (clicking its row in the sidebar, same as
  // ListsPage.test.tsx's convention) shows the earlier toggle survived.
  fireEvent.click(screen.getByText('My Living Dex'))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())
})

test('toggling finalStageOnly narrows the visible rows (3.7)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()

  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: /final stage only/i }))

  // Bulbasaur (evolutionStage: 'pre') doesn't survive; Charizard (evolutionStage: 'final') does.
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()
})

test('each list keeps its own filter state independently (3.7)', async () => {
  seedState([testList('seed', 'My Living Dex'), testList('list-b', 'List B')])
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(window.localStorage.getItem('living-dex:user-state')).not.toBeNull())
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // Turn on finalStageOnly for the default list — Bulbasaur drops out.
  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: /final stage only/i }))
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())

  // Switch to a second list — it has DEFAULT_LIST_FILTER, so Bulbasaur reappears.
  fireEvent.click(screen.getByText('List B'))
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // Switching back to the original list restores its own finalStageOnly toggle.
  fireEvent.click(screen.getByText('My Living Dex'))
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
})

test('dragging a column header (from anywhere on it) reorders the header row and every body row (3.8c)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const headerTextsBefore = screen.getAllByRole('columnheader').map((h) => h.textContent)
  // Default visible order: Sprite, Name, Types, Dex, Box, Slot, Owned (other hideable columns
  // start hidden per DEFAULT_USER_STATE's visibleColumns).
  // Dex carries the default sort arrow (the table opens sorted by Dex ascending).
  expect(headerTextsBefore).toEqual(['⠿Sprite', '⠿Name', '⠿Types', '⠿Dex▲', '⠿Box', '⠿Slot', '⠿Owned'])

  stubHeaderLayout()

  // Draggable from anywhere on the header, not just the grip icon.
  const nameHeader = screen.getByRole('columnheader', { name: '⠿Name' })
  // Name is at index 1 (x range [100,200)); Owned is at index 6 (x range [600,700)).
  fireEvent.pointerDown(nameHeader, { clientX: 150, clientY: 15 })
  fireEvent.pointerMove(window, { clientX: 650, clientY: 15 })
  fireEvent.pointerUp(window, { clientX: 650, clientY: 15 })

  // Dragging rightward (Name started left of Owned) inserts AFTER the target, not before — this
  // is what makes a one-step-right nudge onto an immediate neighbor a real move instead of a
  // no-op (inserting "before" an immediate right neighbor just undoes the removal). So Name ends
  // up last, after Owned.
  const headerTextsAfter = screen.getAllByRole('columnheader').map((h) => h.textContent)
  expect(headerTextsAfter).toEqual(['⠿Sprite', '⠿Types', '⠿Dex▲', '⠿Box', '⠿Slot', '⠿Owned', '⠿Name'])

  // Body cells must reorder identically — otherwise header and data would desync.
  const bulbasaurRow = screen.getByText('Bulbasaur').closest('tr')
  expect(bulbasaurRow).not.toBeNull()
  const cellTextsAfter = Array.from(bulbasaurRow!.querySelectorAll('td')).map((td) => td.textContent)
  // Name (containing 'Bulbasaur') must now render last.
  expect(cellTextsAfter[cellTextsAfter.length - 1]).toBe('Bulbasaur')
})

test('dragging a column onto its immediate right neighbor swaps them (3.8c — regression: this was previously a no-op)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  stubHeaderLayout()

  // Name (index 1) onto its immediate right neighbor Types (index 2) — the most common real drag
  // gesture (a single-step nudge). Always inserting "before" the target was mathematically a
  // no-op for exactly this case: removing the dragged column shifts the target left by one slot,
  // so re-inserting it "before" the (now-shifted) target landed it right back where it started.
  const nameHeader = screen.getByRole('columnheader', { name: '⠿Name' })
  fireEvent.pointerDown(nameHeader, { clientX: 150, clientY: 15 })
  fireEvent.pointerMove(window, { clientX: 250, clientY: 15 })
  fireEvent.pointerUp(window, { clientX: 250, clientY: 15 })

  const headerTextsAfter = screen.getAllByRole('columnheader').map((h) => h.textContent)
  expect(headerTextsAfter).toEqual(['⠿Sprite', '⠿Types', '⠿Name', '⠿Dex▲', '⠿Box', '⠿Slot', '⠿Owned'])
})

test('dragging past the leftmost header (e.g. into the sidebar) clamps to the first column, not aborting the reorder (3.8c)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  stubHeaderLayout()

  // Drag Types (index 2, x range [200,300)) to a negative clientX — well past every header's
  // left edge, simulating the pointer overshooting into the sidebar to the left of the table.
  const typesHeader = screen.getByRole('columnheader', { name: '⠿Types' })
  fireEvent.pointerDown(typesHeader, { clientX: 250, clientY: 15 })
  fireEvent.pointerMove(window, { clientX: -500, clientY: 15 })
  fireEvent.pointerUp(window, { clientX: -500, clientY: 15 })

  // Clamped to the nearest (leftmost, Sprite) column rather than finding no target and aborting.
  const headerTextsAfter = screen.getAllByRole('columnheader').map((h) => h.textContent)
  expect(headerTextsAfter).toEqual(['⠿Types', '⠿Sprite', '⠿Name', '⠿Dex▲', '⠿Box', '⠿Slot', '⠿Owned'])
})

function stubTableWidth(width: number) {
  vi.spyOn(HTMLTableElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 0,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 0,
    toJSON: () => ({}),
  })
}

function storedSizing() {
  return JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}').preferences?.columnSizing ?? {}
}

function colPercents() {
  return Array.from(document.querySelectorAll('colgroup col')).map((col) => parseFloat((col as HTMLElement).style.width))
}

test('dragging a divider moves the boundary: left column grows, right shrinks, others untouched (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  stubTableWidth(632) // default weights sum to 632 here, so 1 weight = 1px
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const handle = screen.getByTestId('resize-handle-name')
  fireEvent.pointerDown(handle, { clientX: 100, clientY: 0, button: 0 })
  fireEvent.pointerMove(handle, { clientX: 160, clientY: 0 })
  fireEvent.pointerUp(handle, { clientX: 160, clientY: 0 })

  await waitFor(() => {
    // Name 200 -> 260, its right neighbour Types 140 -> 80; nothing else is written.
    expect(storedSizing()).toEqual({ name: 260, types: 80 })
  })
})

test('the table always fills 100%: <col> widths sum to 100 and there is no filler cell (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  stubTableWidth(632)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const headerCount = screen.getAllByRole('columnheader').length
  expect(document.querySelectorAll('colgroup col')).toHaveLength(headerCount)
  const bulbasaurRow = screen.getByText('Bulbasaur').closest('tr')!
  expect(bulbasaurRow.querySelectorAll('td')).toHaveLength(headerCount)
  expect(colPercents().reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)

  const handle = screen.getByTestId('resize-handle-name')
  fireEvent.pointerDown(handle, { clientX: 100, clientY: 0, button: 0 })
  fireEvent.pointerMove(handle, { clientX: 160, clientY: 0 })
  fireEvent.pointerUp(handle, { clientX: 160, clientY: 0 })
  await waitFor(() => expect(storedSizing().name).toBe(260))
  expect(colPercents().reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
})

test('the last visible column has no divider (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  expect(screen.getByTestId('resize-handle-dex')).toBeInTheDocument()
  expect(screen.queryByTestId('resize-handle-owned')).not.toBeInTheDocument()
})

test('a drag can\'t push either neighbour below the minimum width (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  stubTableWidth(632)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // Slot (44) | Owned (76): dragging far right can't take Owned below MIN_COLUMN_PX (24).
  const handle = screen.getByTestId('resize-handle-slot')
  fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, button: 0 })
  fireEvent.pointerMove(handle, { clientX: 1000, clientY: 0 })
  fireEvent.pointerUp(handle, { clientX: 1000, clientY: 0 })

  await waitFor(() => expect(storedSizing().owned).toBe(24))
  expect(storedSizing().slot).toBe(96)
})

test('starting a resize does not start a column reorder (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  stubTableWidth(632)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  const handle = screen.getByTestId('resize-handle-name')
  fireEvent.pointerDown(handle, { clientX: 100, clientY: 0, button: 0 })
  fireEvent.pointerMove(window, { clientX: 400, clientY: 15 })
  fireEvent.pointerUp(window, { clientX: 400, clientY: 15 })

  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    '⠿Sprite',
    '⠿Name',
    '⠿Types',
    '⠿Dex▲',
    '⠿Box',
    '⠿Slot',
    '⠿Owned',
  ])
})

test('sprite can\'t be dragged below its larger minimum width (3.8f)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  stubTableWidth(632)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // Sprite (72) | Name (200): dragging far left would shrink Sprite to the default 24 minimum.
  const handle = screen.getByTestId('resize-handle-sprite')
  fireEvent.pointerDown(handle, { clientX: 100, clientY: 0, button: 0 })
  fireEvent.pointerMove(handle, { clientX: -1000, clientY: 0 })
  fireEvent.pointerUp(handle, { clientX: -1000, clientY: 0 })

  await waitFor(() => expect(storedSizing().sprite).toBe(48))
  expect(storedSizing().name).toBe(224)
})

// --- 3.8b: Box/Slot + column sorting ---

function makeEntry(name: string, dex: string, sortIndex: number, generation = 1, region: string | null = null) {
  const base = mockDataset.pokemon.bulbasaur
  return { ...base, slug: name.toLowerCase(), name, dex, sortIndex, generation, region }
}

function datasetOf(entries: ReturnType<typeof makeEntry>[]): PokemonDataset {
  return { ...mockDataset, count: entries.length, pokemon: Object.fromEntries(entries.map((e) => [e.slug, e])) }
}

// Canonical (sortIndex) order is Alpha, Bravo, Charlie; Dex order is the reverse.
const sortableDataset = datasetOf([
  makeEntry('Alpha', '0003', 0, 3, 'kanto'),
  makeEntry('Bravo', '0002', 1, 1, 'johto'),
  makeEntry('Charlie', '0001', 2, 2, 'hoenn'),
])

function bodyRows() {
  return screen.getAllByRole('row').slice(1).map((row) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent))
}

function clickHeader(name: string) {
  const header = screen.getByRole('columnheader', { name: new RegExp(`^⠿${name}`) })
  fireEvent.pointerDown(header, { clientX: 50, clientY: 15, button: 0 })
  fireEvent.pointerUp(window, { clientX: 50, clientY: 15 })
  return header
}

test('Box and Slot are positions in the canonical order, and roll over every 30 (3.8b)', async () => {
  const many = datasetOf(Array.from({ length: 65 }, (_, i) => makeEntry(`Mon${String(i).padStart(2, '0')}`, String(i + 1).padStart(4, '0'), i)))
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => many }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Mon00')).toBeInTheDocument())

  const cellsOf = (name: string) => Array.from(screen.getByText(name).closest('tr')!.querySelectorAll('td')).map((td) => td.textContent)
  // columns: Sprite, Name, Types, Dex, Box, Slot, Owned
  expect(cellsOf('Mon00').slice(4, 6)).toEqual(['1', '1'])
  expect(cellsOf('Mon29').slice(4, 6)).toEqual(['1', '30'])
  expect(cellsOf('Mon30').slice(4, 6)).toEqual(['2', '1'])
  expect(cellsOf('Mon64').slice(4, 6)).toEqual(['3', '5'])
})

test('the table opens sorted by Dex ascending, but Box/Slot still follow the canonical order (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => sortableDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

  expect(screen.getByRole('columnheader', { name: /^⠿Dex/ })).toHaveAttribute('aria-sort', 'ascending')
  // Displayed Charlie, Bravo, Alpha (dex order) — each keeps the slot from its canonical position.
  expect(bodyRows().map((cells) => [cells[1], cells[4], cells[5]])).toEqual([
    ['Charlie', '1', '3'],
    ['Bravo', '1', '2'],
    ['Alpha', '1', '1'],
  ])
})

test('clicking a sortable header sorts ascending, then descending, and never moves Box/Slot (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => sortableDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

  const nameHeader = clickHeader('Name')
  await waitFor(() => expect(nameHeader).toHaveAttribute('aria-sort', 'ascending'))
  expect(bodyRows().map((cells) => cells[1])).toEqual(['Alpha', 'Bravo', 'Charlie'])
  expect(screen.getByRole('columnheader', { name: /^⠿Dex/ })).not.toHaveAttribute('aria-sort')

  clickHeader('Name')
  await waitFor(() => expect(nameHeader).toHaveAttribute('aria-sort', 'descending'))
  expect(bodyRows().map((cells) => [cells[1], cells[5]])).toEqual([
    ['Charlie', '3'],
    ['Bravo', '2'],
    ['Alpha', '1'],
  ])
})

test('Generation sorts ascending first, and Region sorts alphabetically (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => sortableDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

  fireEvent.click(screen.getByText('Columns'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Generation' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Region' }))

  clickHeader('Generation')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^⠿Generation/ })).toHaveAttribute('aria-sort', 'ascending'))
  // generations: Alpha 3, Bravo 1, Charlie 2
  expect(bodyRows().map((cells) => cells[1])).toEqual(['Bravo', 'Charlie', 'Alpha'])

  clickHeader('Region')
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^⠿Region/ })).toHaveAttribute('aria-sort', 'ascending'))
  // regions: Alpha kanto, Bravo johto, Charlie hoenn
  expect(bodyRows().map((cells) => cells[1])).toEqual(['Charlie', 'Bravo', 'Alpha'])
})

test('Box, Slot and Stage headers are not sortable (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => sortableDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Columns'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Stage' }))

  for (const name of ['Box', 'Slot', 'Stage']) {
    const header = clickHeader(name)
    expect(header).not.toHaveAttribute('aria-sort')
    expect(header).not.toHaveAttribute('title')
  }
  expect(screen.getByRole('columnheader', { name: /^⠿Dex/ })).toHaveAttribute('aria-sort', 'ascending')
})

test('dragging a header reorders it without changing the sort (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => sortableDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
  stubHeaderLayout()

  const nameHeader = screen.getByRole('columnheader', { name: /^⠿Name/ })
  fireEvent.pointerDown(nameHeader, { clientX: 150, clientY: 15, button: 0 })
  fireEvent.pointerMove(window, { clientX: 250, clientY: 15 })
  fireEvent.pointerUp(window, { clientX: 250, clientY: 15 })

  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    '⠿Sprite',
    '⠿Types',
    '⠿Name',
    '⠿Dex▲',
    '⠿Box',
    '⠿Slot',
    '⠿Owned',
  ])
  expect(screen.getByRole('columnheader', { name: /^⠿Name/ })).not.toHaveAttribute('aria-sort')
})

// --- 3.8d: per-game availability ---

// Alpha: obtainable in Red, conditional in Gold. Bravo: only an event code (unobtainable).
// Charlie: no availability data at all (older dataset).
const availabilityDataset = datasetOf([
  { ...makeEntry('Alpha', '0001', 0), availability: { red: 'C', gold: 'ET' } },
  { ...makeEntry('Bravo', '0002', 1), availability: { gold: 'Ev' } },
  makeEntry('Charlie', '0003', 2),
])

function availabilityCell(name: string) {
  // columns: Sprite, Name, Types, Dex, Box, Slot, Availability, Owned
  return screen.getByText(name).closest('tr')!.querySelectorAll('td')[6]
}

async function renderWithAvailabilityColumn() {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => availabilityDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
  fireEvent.click(screen.getByText('Columns'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Availability' }))
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^⠿Availability/ })).toBeInTheDocument())
}

test('the Availability column counts selected games and lists them in a tooltip (3.8d)', async () => {
  await renderWithAvailabilityColumn()

  expect(availabilityCell('Alpha').textContent).toBe('2 / 41')
  expect(availabilityCell('Alpha').querySelector('[title]')).toHaveAttribute('title', 'Red, Gold (conditional)')
  expect(availabilityCell('Bravo').textContent).toBe('0 / 41')
  expect(availabilityCell('Bravo').querySelector('[title]')).toHaveAttribute('title', 'Not obtainable in the selected games')
  expect(availabilityCell('Charlie').textContent).toBe('—')
})

test('deselecting a game in Filters updates the counts, and the selection is persisted (3.8d)', async () => {
  await renderWithAvailabilityColumn()

  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Red' }))

  await waitFor(() => expect(availabilityCell('Alpha').textContent).toBe('1 / 40'))
  await waitFor(() =>
    expect(JSON.parse(window.localStorage.getItem('living-dex:user-state')!).lists[Object.keys(JSON.parse(window.localStorage.getItem('living-dex:user-state')!).lists)[0]].settings.excludedGameIds).toEqual(['red']),
  )
})

test('Hide inaccessible drops Pokémon obtainable in none of the selected games, but not ones without data (3.8d)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => availabilityDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bravo')).toBeInTheDocument())

  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: /hide inaccessible/i }))
  await waitFor(() => expect(screen.queryByText('Bravo')).not.toBeInTheDocument())
  expect(screen.getByText('Alpha')).toBeInTheDocument()
  expect(screen.getByText('Charlie')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'None' }))
  await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument())
  expect(screen.getByText('Charlie')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'All' }))
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
})

test('the Availability column sorts by count, ascending first (3.8d)', async () => {
  await renderWithAvailabilityColumn()

  const header = clickHeader('Availability')
  await waitFor(() => expect(header).toHaveAttribute('aria-sort', 'ascending'))
  expect(bodyRows().map((cells) => cells[1])).toEqual(['Charlie', 'Bravo', 'Alpha'])
})

// --- 3.8e: inaccessible rows are visually muted ---

test('rows obtainable in none of the selected games are muted; rows without data or with any game are not (3.8e)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => availabilityDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bravo')).toBeInTheDocument())

  // Bravo: only an event code → inaccessible. Alpha: obtainable in Red. Charlie: no data.
  expect(screen.getByText('Bravo').closest('tr')).toHaveClass('text-muted')
  expect(screen.getByText('Alpha').closest('tr')).not.toHaveClass('text-muted')
  expect(screen.getByText('Charlie').closest('tr')).not.toHaveClass('text-muted')
})

test('deselecting every game mutes all rows that have availability data (3.8e)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => availabilityDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('button', { name: 'None' }))
  await waitFor(() => expect(screen.getByText('Alpha').closest('tr')).toHaveClass('text-muted'))
  expect(screen.getByText('Charlie').closest('tr')).not.toHaveClass('text-muted')
})

// --- 3.7b: "obtained from" game tags ---

function gamesButton(name: string) {
  return screen.getByRole('button', { name: `Obtained from games for ${name}` })
}

function ownedCheckbox(name: string) {
  return screen.getByRole('checkbox', { name: `Mark ${name} as owned` })
}

async function openGamePicker(name: string) {
  fireEvent.click(gamesButton(name))
  return within(await screen.findByRole('dialog', { name: `Obtained from — ${name}` }))
}

async function renderAvailabilityDataset() {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => availabilityDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
}

function storedActiveList() {
  const state = JSON.parse(window.localStorage.getItem('living-dex:user-state')!)
  return state.lists[state.activeListId]
}

test('the games button opens a picker with only the accessible games, without toggling the row (3.7b)', async () => {
  await renderAvailabilityDataset()

  const picker = await openGamePicker('Alpha')
  expect(picker.getAllByRole('checkbox').map((cb) => cb.getAttribute('aria-label'))).toEqual(['Red', 'Gold (conditional)'])
  expect(gamesButton('Alpha')).toHaveAttribute('aria-expanded', 'true')
  expect(ownedCheckbox('Alpha')).not.toBeChecked()
})

test('ticking a game owns the Pokémon; unticking it keeps it owned (rules 2, 3, 5, 6 — 3.7b)', async () => {
  await renderAvailabilityDataset()

  const picker = await openGamePicker('Alpha')
  fireEvent.click(picker.getByRole('checkbox', { name: 'Red' }))
  await waitFor(() => expect(ownedCheckbox('Alpha')).toBeChecked())
  expect(picker.getByRole('checkbox', { name: 'Red' })).toBeChecked()
  expect(gamesButton('Alpha').textContent).toBe('1')
  await waitFor(() => expect(storedActiveList().ownedGames).toEqual({ alpha: ['red'] }))

  fireEvent.click(picker.getByRole('checkbox', { name: 'Red' }))
  await waitFor(() => expect(gamesButton('Alpha').textContent).toBe(''))
  expect(ownedCheckbox('Alpha')).toBeChecked()
})

test('clicking an owned row unowns it and clears its game tags (rule 4 — 3.7b)', async () => {
  await renderAvailabilityDataset()

  const picker = await openGamePicker('Alpha')
  fireEvent.click(picker.getByRole('checkbox', { name: 'Gold (conditional)' }))
  await waitFor(() => expect(ownedCheckbox('Alpha')).toBeChecked())
  fireEvent.keyDown(document, { key: 'Escape' })

  fireEvent.click(screen.getByText('Alpha'))
  await waitFor(() => expect(ownedCheckbox('Alpha')).not.toBeChecked())
  expect(gamesButton('Alpha').textContent).toBe('')
  const reopened = await openGamePicker('Alpha')
  expect(reopened.getByRole('checkbox', { name: 'Gold (conditional)' })).not.toBeChecked()
})

test('the picker closes on Escape, on a tap outside, and when its button is tapped again (3.7b)', async () => {
  await renderAvailabilityDataset()

  await openGamePicker('Alpha')
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

  await openGamePicker('Alpha')
  fireEvent.pointerDown(screen.getByText('Bravo'))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

  await openGamePicker('Alpha')
  fireEvent.click(gamesButton('Alpha'))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('Pokémon with no accessible games or no data show an explanation instead of games (3.7b)', async () => {
  await renderAvailabilityDataset()

  const bravo = await openGamePicker('Bravo')
  expect(bravo.getByText('Not obtainable in the selected games')).toBeInTheDocument()
  expect(bravo.queryAllByRole('checkbox')).toHaveLength(0)

  const charlie = await openGamePicker('Charlie')
  expect(charlie.getByText('No availability data')).toBeInTheDocument()
})

test('tapping the Availability cell opens the same picker (touch has no hover tooltip — 3.7b)', async () => {
  await renderWithAvailabilityColumn()

  fireEvent.click(screen.getByRole('button', { name: /^Availability of Alpha/ }))
  const picker = within(await screen.findByRole('dialog', { name: 'Obtained from — Alpha' }))
  expect(picker.getByRole('checkbox', { name: 'Red' })).toBeInTheDocument()
  expect(ownedCheckbox('Alpha')).not.toBeChecked()
})

test('a tag on a game later deselected in Filters is kept and shown as "not in selection" (3.7b)', async () => {
  await renderAvailabilityDataset()

  const picker = await openGamePicker('Alpha')
  fireEvent.click(picker.getByRole('checkbox', { name: 'Red' }))
  await waitFor(() => expect(gamesButton('Alpha').textContent).toBe('1'))
  fireEvent.keyDown(document, { key: 'Escape' })

  fireEvent.click(screen.getByText('Filters'))
  const filterRed = screen.getAllByRole('checkbox', { name: 'Red' }).find((cb) => !cb.closest('[role="dialog"]'))!
  fireEvent.click(filterRed)

  const reopened = await openGamePicker('Alpha')
  const red = reopened.getByRole('checkbox', { name: 'Red (not in selection)' })
  expect(red).toBeChecked()
  expect(storedActiveList().ownedGames).toEqual({ alpha: ['red'] })
})

test('shows owned progress and the dismissible welcome card (3.8)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())

  // Living-form tier keeps Bulbasaur + Charizard (the gender variant is filtered out).
  expect(screen.getByText('0 / 2 owned')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: /owned progress/i })).toHaveAttribute('aria-valuenow', '0')

  expect(screen.getByRole('region', { name: /welcome/i })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /got it/i }))
  expect(screen.queryByRole('region', { name: /welcome/i })).not.toBeInTheDocument()
  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('living-dex:user-state') ?? '{}')
    expect(stored.preferences?.welcomeDismissed).toBe(true)
  })
})

test('the "#" column is the place in the displayed list and follows sorting, while Slot does not (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox', { name: '#' }))
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^⠿#/ })).toBeInTheDocument())

  const cellsOf = (name: string) => bodyRows().find((cells) => cells.includes(name))!
  const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.replace('⠿', '').replace(/[▲▼]/g, ''))
  const pos = headers.indexOf('#')
  const slot = headers.indexOf('Slot')
  expect(cellsOf('Bulbasaur')[pos]).toBe('1')
  expect(cellsOf('Charizard')[pos]).toBe('2')

  // Dex is already sorted ascending by default, so one click flips it to descending.
  clickHeader('Dex')
  await waitFor(() => expect(cellsOf('Charizard')[pos]).toBe('1'))
  expect(cellsOf('Bulbasaur')[pos]).toBe('2')
  // Slot stays the canonical position regardless of the display order.
  expect(cellsOf('Bulbasaur')[slot]).toBe('1')
  expect(cellsOf('Charizard')[slot]).toBe('2')
})

test('the Species column shows the bare species name and starts hidden (3.8b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.queryByRole('columnheader', { name: /species/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Species' }))
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /species/i })).toBeInTheDocument())
  // Same text as Name for these fixtures, so each species now appears in two cells of its row.
  expect(screen.getAllByText('Charizard')).toHaveLength(2)
})

test('medals come from every tier at once and ignore the tier dropdown (3.14b)', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()

  await screen.findByRole('checkbox', { name: /mark charizard as owned/i })
  fireEvent.click(screen.getByRole('checkbox', { name: /mark charizard as owned/i }))

  // Charizard is the only Final Form entry, so owning it completes that tier but only half of Living Form.
  const panel = () => screen.getByRole('region', { name: 'Trophies' })
  await waitFor(() => expect(within(panel()).getByRole('img', { name: 'Final Form 100% (earned)' })).toBeInTheDocument())
  expect(within(panel()).queryByRole('img', { name: /Living Form 100%/ })).not.toBeInTheDocument()
  const earnedBefore = within(panel()).getAllByRole('img').map((m) => m.getAttribute('aria-label'))

  fireEvent.change(screen.getByLabelText(/tier/i), { target: { value: 'final-form' } })
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(within(panel()).getAllByRole('img').map((m) => m.getAttribute('aria-label'))).toEqual(earnedBefore)
})

test('Reset columns in the menu restores the default layout', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  renderHomePage()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.getByText('grass')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Reset columns' }))
  await waitFor(() => expect(screen.queryByText('grass')).not.toBeInTheDocument())
  const headers = screen.getAllByRole('columnheader').map((th) => th.textContent?.replace(/[⠿▲▼]/g, '').trim())
  expect(headers).toEqual(['Sprite', 'Dex', 'Name', 'Owned'])
})

// --- 3.19 / 3.19b: tier picker, box plan banner, stable Box/Slot, owned safety ----------------------------------
// mockDataset: bulbasaur (pre, #0), pikachu-female (gender variant, #1), charizard (final, #2).
// Living Form Full = all 3; Living Form = Living Lite = {bulbasaur, charizard}; Final Form (Full) = {charizard}.

type StoredList = { id: string; name: string; tier?: string; layoutTier?: string; ownedIds: string[]; ownedGames?: Record<string, string[]> }
const stored = () => JSON.parse(window.localStorage.getItem('living-dex:user-state')!)
const storedLists = () => Object.values(stored().lists) as StoredList[]
const slotOf = (name: string) => {
  const row = bodyRows().find((cells) => cells[1] === name)
  return row ? [row[4], row[5]] : null
}
// Classic layout (Box/Slot visible) with one list carrying the given tier fields.
function seedTieredList(extra: Record<string, unknown>) {
  const state = stored()
  state.lists.seed = { ...state.lists.seed, ...extra }
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
}
const tierSelect = () => screen.getByLabelText(/tier/i)
const renderWithData = () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => mockDataset }) as Response)
  return renderHomePage()
}

test('a new user picks a tier from big tiles; Box/Slot stay locked until the plan is decided (3.19b)', async () => {
  const { preferences } = stored()
  window.localStorage.clear()
  window.localStorage.setItem('living-dex:user-state', JSON.stringify({ ...DEFAULT_USER_STATE, preferences }))
  renderWithData()

  const picker = await screen.findByRole('region', { name: 'Choose what to collect' })
  expect(within(picker).getByText('Quickest goal')).toBeInTheDocument()
  expect(within(picker).getByText('Classic')).toBeInTheDocument()
  expect(within(picker).getByText('Everything')).toBeInTheDocument()
  expect(within(picker).getByRole('link', { name: "What's the difference?" })).toBeInTheDocument()
  const tile = await within(picker).findByRole('button', { name: 'Final Form' })
  await waitFor(() => expect(tile).toBeEnabled())
  fireEvent.click(tile)
  fireEvent.click(tile) // a double tap must not create a second list

  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  expect(storedLists()).toHaveLength(1)
  expect(storedLists()[0]).toMatchObject({ name: 'My Living Dex', tier: 'final-form' })
  expect(storedLists()[0].layoutTier).toBeUndefined()
  const banner = screen.getByRole('region', { name: 'Plan your boxes' })
  expect(banner).toHaveTextContent('Box and Slot stay hidden')
  expect(screen.getAllByRole('img', { name: 'Locked until you plan your boxes' })).toHaveLength(2)

  // The Plan dropdown only offers the tier itself and bigger tiers that contain Final Form, with the extra slots.
  const plan = within(banner).getByRole('combobox', { name: 'Plan' })
  expect(within(plan).getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Choose your plan…',
    'Final Form (same as tier)',
    'Living Form Full (+2 slots · Recommended)',
    'Living Form (+1 slots)',
    'Living Lite (+1 slots)',
  ])
  fireEvent.change(plan, { target: { value: 'living-form-full' } })

  await waitFor(() => expect(screen.queryByRole('region', { name: 'Plan your boxes' })).not.toBeInTheDocument())
  expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('living-form-full')
  expect(slotOf('Charizard')).toEqual(['1', '3'])
  expect(storedLists()[0]).toMatchObject({ tier: 'final-form', layoutTier: 'living-form-full' })

  // Future slots: hidden by default, shown greyed (not ownable) with their real Box/Slot.
  expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show future slots' }))
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(slotOf('Bulbasaur')).toEqual(['1', '1'])
  expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeDisabled()
  fireEvent.click(screen.getByText('Bulbasaur'))
  expect(storedLists()[0].ownedIds).toEqual([])
})

test('"same as tier" keeps the plan on the same tier and unlocks Box/Slot; the plan can still grow later (3.19b)', async () => {
  seedTieredList({ tier: 'final-form' })
  renderWithData()
  const banner = await screen.findByRole('region', { name: 'Plan your boxes' })
  fireEvent.change(within(banner).getByRole('combobox', { name: 'Plan' }), { target: { value: 'final-form' } })
  await waitFor(() => expect(slotOf('Charizard')).toEqual(['1', '1']))
  expect(storedLists()[0]).toMatchObject({ tier: 'final-form', layoutTier: 'final-form' })
  expect(screen.getByRole('combobox', { name: 'Plan' })).toHaveValue('final-form')
  fireEvent.change(screen.getByRole('combobox', { name: 'Plan' }), { target: { value: 'living-form' } })
  await waitFor(() => expect(slotOf('Charizard')).toEqual(['1', '2']))
})

test('Living Form Full has nothing bigger: no banner, Box/Slot visible straight away (3.19b)', async () => {
  seedTieredList({ tier: 'living-form-full' })
  renderWithData()
  await waitFor(() => expect(screen.getByText('Pikachu (female)')).toBeInTheDocument())
  expect(screen.queryByRole('region', { name: 'Plan your boxes' })).not.toBeInTheDocument()
  expect(slotOf('Charizard')).toEqual(['1', '3'])
})

test('Box/Slot no longer move when a filter hides rows (3.19)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  expect(slotOf('Charizard')).toEqual(['1', '2'])
  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: /final stage only/i }))
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(slotOf('Charizard')).toEqual(['1', '2'])
})

test('changing the tier inside the plan asks again, offering to keep the old plan first (3.19b)', async () => {
  seedTieredList({ tier: 'final-form', layoutTier: 'living-form-full' })
  renderWithData()
  await waitFor(() => expect(slotOf('Charizard')).toEqual(['1', '3']))
  fireEvent.change(tierSelect(), { target: { value: 'living-form' } })
  const banner = await screen.findByRole('region', { name: 'Plan your boxes' })
  expect(screen.queryByRole('dialog', { name: 'Change tier' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('img', { name: 'Locked until you plan your boxes' }).length).toBeGreaterThan(0)
  const plan = within(banner).getByRole('combobox', { name: 'Plan' })
  const first = within(plan).getAllByRole('option')[2] // after "Choose your plan…" and "same as tier"
  expect(first).toHaveTextContent('Keep Living Form Full')
  fireEvent.change(plan, { target: { value: (first as HTMLOptionElement).value } })
  await waitFor(() => expect(slotOf('Charizard')).toEqual(['1', '3']))
  expect(storedLists()[0]).toMatchObject({ tier: 'living-form', layoutTier: 'living-form-full' })
})

test('a tier outside the plan asks first: Cancel, Switch anyway, Copy to a new list (3.19)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i }))

  fireEvent.change(tierSelect(), { target: { value: 'living-form-full' } })
  let dialog = screen.getByRole('dialog', { name: 'Change tier' })
  expect(within(dialog).getByText(/adds 1/)).toBeInTheDocument()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(tierSelect()).toHaveValue('living-form')

  fireEvent.change(tierSelect(), { target: { value: 'living-form-full' } })
  dialog = screen.getByRole('dialog', { name: 'Change tier' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copy to a new list' }))
  await waitFor(() => expect(screen.getByText('Pikachu (female)')).toBeInTheDocument())
  expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked()
  await waitFor(() => expect(storedLists()).toHaveLength(2))
  expect(storedLists()).toMatchObject([
    { name: 'My Living Dex', ownedIds: ['bulbasaur'] },
    { name: 'My Living Dex (Living Form Full)', tier: 'living-form-full', ownedIds: ['bulbasaur'] },
  ])
  expect(storedLists()[0].tier).toBeUndefined()

  fireEvent.click(screen.getByText('My Living Dex'))
  await waitFor(() => expect(screen.queryByText('Pikachu (female)')).not.toBeInTheDocument())
  fireEvent.change(tierSelect(), { target: { value: 'living-form-full' } })
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Change tier' })).getByRole('button', { name: 'Switch anyway' }))
  await waitFor(() => expect(screen.getByText('Pikachu (female)')).toBeInTheDocument())
  expect(storedLists()[0]).toMatchObject({ name: 'My Living Dex', tier: 'living-form-full', ownedIds: ['bulbasaur'] })
})

test('owned entries outside the tier are counted and come back when switching back (3.19b)', async () => {
  seedTieredList({ ownedIds: ['bulbasaur'] })
  renderWithData()
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())
  fireEvent.change(tierSelect(), { target: { value: 'final-form' } })
  await waitFor(() => expect(screen.getByText(/1 owned outside this tier/)).toBeInTheDocument())
  fireEvent.change(tierSelect(), { target: { value: 'living-form' } })
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /mark bulbasaur as owned/i })).toBeChecked())
})

test('completing a tier inside a bigger plan offers to advance and keeps the plan (3.19b)', async () => {
  seedTieredList({ tier: 'final-form', layoutTier: 'living-form-full', ownedIds: ['charizard'] })
  renderWithData()
  const done = await screen.findByText(/Final Form complete/)
  const status = done.closest('[role="status"]') as HTMLElement
  expect(within(status).getAllByRole('button').map((b) => b.textContent)).toEqual([
    'Advance to Living Form Full',
    'Advance to Living Form',
    'Advance to Living Lite',
  ])
  fireEvent.click(within(status).getByRole('button', { name: 'Advance to Living Form' }))
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
  expect(screen.queryByRole('region', { name: 'Plan your boxes' })).not.toBeInTheDocument()
  expect(storedLists()[0]).toMatchObject({ tier: 'living-form', layoutTier: 'living-form-full' })
  expect(slotOf('Charizard')).toEqual(['1', '3'])
})

test('no owned selection is ever lost, whatever order tiers and plans are changed in (3.19b)', async () => {
  const owned = ['bulbasaur', 'pikachu-female', 'charizard']
  const games = { charizard: ['red'], 'pikachu-female': ['yellow'] }
  seedTieredList({ tier: 'living-form-full', ownedIds: owned, ownedGames: games })
  renderWithData()
  await waitFor(() => expect(screen.getByText('Pikachu (female)')).toBeInTheDocument())

  const pick = async (tier: string) => {
    fireEvent.change(tierSelect(), { target: { value: tier } })
    const dialog = screen.queryByRole('dialog', { name: 'Change tier' })
    if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Switch anyway' }))
    await waitFor(() => expect(tierSelect()).toHaveValue(tier))
  }
  const answer = async (choice: 'not-now' | 'plan') => {
    const banner = screen.queryByRole('region', { name: 'Plan your boxes' })
    if (!banner) return
    const plan = within(banner).getByRole('combobox', { name: 'Plan' })
    if (choice === 'not-now') fireEvent.change(plan, { target: { value: (tierSelect() as HTMLSelectElement).value } })
    else fireEvent.change(plan, { target: { value: (within(plan).getAllByRole('option')[2] as HTMLOptionElement).value } })
  }
  const sequence: Array<[string, 'not-now' | 'plan']> = [
    ['final-form', 'plan'],
    ['living-lite', 'not-now'],
    ['final-form-full', 'plan'],
    ['living-form', 'not-now'],
    ['final-form', 'not-now'],
    ['living-form-full', 'plan'],
    ['living-lite', 'plan'],
    ['final-form-full', 'not-now'],
    ['living-form-full', 'not-now'],
  ]
  for (const [tier, choice] of sequence) {
    await pick(tier)
    await answer(choice)
    const list = storedLists()[0]
    expect(new Set(list.ownedIds)).toEqual(new Set(owned))
    expect(list.ownedGames).toEqual(games)
  }
  expect(storedLists()).toHaveLength(1)
})

// --- 3.18: grid view ---------------------------------------------------------------------------------------------

test('the grid shows HOME-style boxes by the plan, marks owned, and the choice persists (3.18)', async () => {
  seedTieredList({ tier: 'final-form', layoutTier: 'living-form-full' })
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))

  const box = await screen.findByRole('region', { name: 'Box 1' })
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByText('Columns')).not.toBeInTheDocument()
  // Living Form Full order: bulbasaur, pikachu-female (reserved), charizard (slot 3). The grid shows reserved slots
  // by default (3.33): grey sprites with the name.
  expect(within(box).getAllByRole('img', { name: /reserved for your planned goal/ })).toHaveLength(2)
  fireEvent.click(within(box).getByRole('button', { name: 'Mark Charizard as owned' }))
  await waitFor(() => expect(storedLists()[0].ownedIds).toEqual(['charizard']))
  expect(within(box).getByRole('heading')).toHaveTextContent('1/1')
  expect(storedLists()[0].settings?.viewMode).toBe('grid')
})

test('with an undecided plan the grid asks to decide it first (3.18)', async () => {
  seedTieredList({ tier: 'final-form' })
  const state = stored()
  Object.values(state.lists).forEach((l) => (l.settings = { viewMode: 'grid' }))
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  renderWithData()
  expect(await screen.findByText(/Decide your box plan above to see your boxes/)).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Box 1' })).not.toBeInTheDocument()
  fireEvent.change(within(screen.getByRole('region', { name: 'Plan your boxes' })).getByRole('combobox', { name: 'Plan' }), {
    target: { value: 'final-form' },
  })
  expect(await screen.findByRole('region', { name: 'Box 1' })).toBeInTheDocument()
})

test('view settings belong to each list: grid on one list does not change the other (3.36)', async () => {
  seedState([
    testList('1', 'One', { tier: 'living-form', layoutTier: 'living-form', settings: { viewMode: 'grid' } }),
    testList('2', 'Two', { tier: 'living-form', layoutTier: 'living-form' }),
  ])
  renderWithData()
  expect(await screen.findByRole('region', { name: 'Box 1' })).toBeInTheDocument()
  const state = stored()
  state.activeListId = '2'
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  cleanup()
  renderWithData()
  expect(await screen.findByRole('table')).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Box 1' })).not.toBeInTheDocument()
})

test('the grid has its own filters, independent of the table (3.35), and one toggle switches views (3.34)', async () => {
  seedTieredList({ tier: 'living-form', layoutTier: 'living-form' })
  const state = stored()
  Object.values(state.lists).forEach((l) => (l.filter = { ...l.filter, finalStageOnly: true }))
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))
  const box = await screen.findByRole('region', { name: 'Box 1' })
  // The table's "final stage only" does not apply in the grid: every tier slot is tappable.
  expect(within(box).queryByRole('img', { name: /hidden by filters/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Switch to table view' })).toBeInTheDocument()

  fireEvent.click(screen.getByText('Filters'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Final stage only' }))
  await waitFor(() => expect(storedLists()[0].settings?.grid?.filter?.finalStageOnly).toBe(true))
  expect(storedLists()[0].filter.finalStageOnly).toBe(true) // the table's stays as it was
})

test('"Show future slots" is a table-only option; the grid always shows reserved slots (3.55)', async () => {
  seedTieredList({ tier: 'final-form', layoutTier: 'living-form-full' })
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  expect((screen.getByRole('checkbox', { name: 'Show future slots' }) as HTMLInputElement).checked).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))
  const box = await screen.findByRole('region', { name: 'Box 1' })
  expect(screen.queryByRole('checkbox', { name: 'Show future slots' })).not.toBeInTheDocument()
  expect(within(box).getAllByRole('img', { name: /reserved for your planned goal/ })).toHaveLength(2)
})

test('Columns and Filters menus are mutually exclusive (3.53)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  const details = (label: string) => screen.getByText(label, { selector: 'summary' }).closest('details')!
  fireEvent.click(screen.getByText('Columns', { selector: 'summary' }))
  await waitFor(() => expect(details('Columns').open).toBe(true))
  fireEvent.click(screen.getByText('Filters', { selector: 'summary' }))
  await waitFor(() => expect(details('Filters').open).toBe(true))
  await waitFor(() => expect(details('Columns').open).toBe(false))
})

test('the Table/Grid toggle stays put and the plan row has a single "?" (3.48/3.51)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  expect(screen.getByText('Columns', { selector: 'summary' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Explain the collection goals' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Switch to grid view' }))
  await screen.findByRole('region', { name: 'Box 1' })
  expect(screen.queryByText('Columns')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Switch to table view' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'Switch to grid view' })).toHaveAttribute('aria-pressed', 'true')
})

test('search narrows the table by name or Dex number without touching progress or Box/Slot (3.32)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  const progressBefore = screen.getByRole('progressbar', { name: 'Owned progress' }).parentElement!.textContent
  const slotBefore = slotOf('Charizard')

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Pokémon' }), { target: { value: 'char' } })
  await waitFor(() => expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument())
  expect(screen.getByText('Charizard')).toBeInTheDocument()
  expect(slotOf('Charizard')).toEqual(slotBefore)
  expect(screen.getByRole('progressbar', { name: 'Owned progress' }).parentElement!.textContent).toBe(progressBefore)

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Pokémon' }), { target: { value: '1' } })
  await waitFor(() => expect(screen.getByText('Bulbasaur')).toBeInTheDocument())
})

test('"/" focuses the search box and Escape clears it (3.32)', async () => {
  renderWithData()
  await waitFor(() => expect(screen.getByText('Charizard')).toBeInTheDocument())
  fireEvent.keyDown(document.body, { key: '/' })
  const box = screen.getByRole('searchbox', { name: 'Search Pokémon' })
  expect(box).toHaveFocus()
  fireEvent.change(box, { target: { value: 'zzz' } })
  fireEvent.keyDown(box, { key: 'Escape' })
  expect(box).toHaveValue('')
})

test('in the grid, search dims the tiles that do not match and keeps the box layout (3.32)', async () => {
  seedTieredList({ tier: 'living-form', layoutTier: 'living-form' })
  const state = stored()
  Object.values(state.lists).forEach((l) => (l.settings = { viewMode: 'grid' }))
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  renderWithData()
  const box = await screen.findByRole('region', { name: 'Box 1' })
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Pokémon' }), { target: { value: 'charizard' } })
  await waitFor(() => expect(within(box).getByRole('button', { name: 'Mark Bulbasaur as owned' })).toHaveClass('opacity-25'))
  expect(within(box).getByRole('button', { name: 'Mark Charizard as owned' })).not.toHaveClass('opacity-25')
})

test('trophies count every list together, whichever list is active (3.30)', async () => {
  seedState([
    testList('1', 'One', { tier: 'living-form-full', layoutTier: 'living-form-full', ownedIds: ['bulbasaur'] }),
    testList('2', 'Two', { tier: 'living-form-full', layoutTier: 'living-form-full', ownedIds: ['charizard'] }),
  ])
  renderWithData()
  const panel = await screen.findByRole('region', { name: 'Trophies' })
  // 50% of the 3-entry Living Form Full needs 2: neither list has it alone, together they do.
  await waitFor(() => expect(within(panel).getByRole('img', { name: 'Living Form Full 50% (earned)' })).toBeInTheDocument())
  expect(within(panel).getByText('Counts every list (2).')).toBeInTheDocument()

  const state = stored()
  state.activeListId = '2'
  window.localStorage.setItem('living-dex:user-state', JSON.stringify(state))
  cleanup()
  renderWithData()
  const again = await screen.findByRole('region', { name: 'Trophies' })
  await waitFor(() => expect(within(again).getByRole('img', { name: 'Living Form Full 50% (earned)' })).toBeInTheDocument())
})
