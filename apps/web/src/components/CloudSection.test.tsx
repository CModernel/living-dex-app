import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { PokemonList } from '@living-dex/business-logic'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CloudSyncProvider } from '../state/CloudSyncContext'
import { UserStateProvider, useUserState } from '../state/UserStateContext'
import { seedState, STORAGE_KEY, testList } from '../test/seed'
import CloudSection from './CloudSection'
import SyncIndicator from './SyncIndicator'

// A fake cloud: per-list rows (null = tombstone), the v1 single row, and every push applied to the rows.
const mock = vi.hoisted(() => ({
  configured: true,
  session: null as null | { user: { id: string; email: string } },
  rows: {} as Record<string, unknown>,
  legacy: [] as unknown[],
  pushes: [] as Record<string, unknown>[],
  pullError: null as Error | null,
  deleteError: null as Error | null,
}))

vi.mock('../lib/cloud', () => ({
  get cloudConfigured() {
    return mock.configured
  },
  watchSession: vi.fn(async (cb: (s: unknown) => void) => {
    cb(mock.session)
    return () => {}
  }),
  signInWithEmail: vi.fn(async () => {}),
  signInWithGoogle: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
  pullListRows: vi.fn(async () => {
    if (mock.pullError) throw mock.pullError
    return structuredClone(mock.rows)
  }),
  pullLists: vi.fn(async () => structuredClone(mock.legacy)),
  deleteAccount: vi.fn(async () => {
    if (mock.deleteError) throw mock.deleteError
    mock.rows = {}
  }),
  pushListRows: vi.fn(async (_id: string, rows: Record<string, unknown>) => {
    mock.pushes.push(rows)
    Object.assign(mock.rows, structuredClone(rows))
  }),
}))

import * as cloud from '../lib/cloud'

// Lets a test change the lists like the app would (owned toggles live in HomePage).
let setLists: (fn: (lists: Record<string, PokemonList>) => Record<string, PokemonList>) => void = () => {}
function ListsHandle() {
  const [, setState] = useUserState()
  setLists = (fn) => setState((prev) => ({ ...prev, lists: fn(prev.lists) }))
  return null
}

const onExport = vi.fn()
const renderSection = () =>
  render(
    <MemoryRouter>
      <UserStateProvider>
        <CloudSyncProvider>
          <SyncIndicator />
          <CloudSection onExport={onExport} />
          <ListsHandle />
        </CloudSyncProvider>
      </UserStateProvider>
    </MemoryRouter>,
  )

const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).lists as Record<string, PokemonList>
const status = () => within(screen.getByRole('region', { name: 'Cloud sync' })).getByText(/Last synced|Sync failed|Offline|Not synced/)
const signIn = () => (mock.session = { user: { id: 'user-1', email: 'ash@example.com' } })

beforeEach(() => {
  window.localStorage.clear()
  Object.assign(mock, { configured: true, session: null, rows: {}, legacy: [], pushes: [], pullError: null, deleteError: null })
  vi.clearAllMocks()
})
afterEach(() => {
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

test('renders nothing when this build has no cloud config', () => {
  mock.configured = false
  const { container } = renderSection()
  expect(container).toBeEmptyDOMElement()
})

test('signed out: magic link and Google sign-in', async () => {
  renderSection()
  fireEvent.change(await screen.findByRole('textbox', { name: 'Email' }), { target: { value: 'ash@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send magic link' }))
  expect(await screen.findByText('Check your email for the sign-in link.')).toBeInTheDocument()
  expect(cloud.signInWithEmail).toHaveBeenCalledWith('ash@example.com')
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
  expect(cloud.signInWithGoogle).toHaveBeenCalled()
})

test('magic link: a second submit while the first is in flight sends nothing and the button shows progress', async () => {
  let finish: () => void = () => {}
  vi.mocked(cloud.signInWithEmail).mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
  renderSection()
  const input = await screen.findByRole('textbox', { name: 'Email' })
  fireEvent.change(input, { target: { value: 'ash@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send magic link' }))
  const busy = await screen.findByRole('button', { name: 'Sending…' })
  expect(busy).toBeDisabled()
  fireEvent.submit(input.closest('form')!) // Enter pressed while sending
  expect(cloud.signInWithEmail).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  expect(await screen.findByText('Check your email for the sign-in link.')).toBeInTheDocument()
  expect(cloud.signInWithEmail).toHaveBeenCalledTimes(1)
})

test('magic link: after a failed send the button is usable again', async () => {
  vi.mocked(cloud.signInWithEmail).mockRejectedValueOnce(new Error('rate limit'))
  renderSection()
  fireEvent.change(await screen.findByRole('textbox', { name: 'Email' }), { target: { value: 'ash@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send magic link' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('rate limit')
  expect(screen.getByRole('button', { name: 'Send magic link' })).toBeEnabled()
})

test('signed in, it syncs on start with no click: cloud lists arrive, merged and new lists go up (3.42)', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] }), testList('n', 'New here')])
  signIn()
  mock.rows = { a: testList('a', 'Mine', { ownedIds: ['y'] }), b: testList('b', 'From phone', { ownedIds: ['z'] }) }
  renderSection()
  expect(await screen.findByText('ash@example.com')).toBeInTheDocument()
  await waitFor(() => expect(status()).toHaveTextContent('Last synced'))
  expect([...stored().a.ownedIds].sort()).toEqual(['x', 'y'])
  expect(stored().b.ownedIds).toEqual(['z'])
  expect(Object.keys(mock.pushes[0]).sort()).toEqual(['a', 'n']) // b is already in the cloud as is
  expect(screen.getByRole('status', { name: 'Cloud sync: Synced' })).toBeInTheDocument()
})

test('the first sync imports collections stored by the v1 "Sync now" row', async () => {
  signIn()
  mock.legacy = [testList('old', 'Synced before 3.42', { ownedIds: ['q'] })]
  renderSection()
  await waitFor(() => expect(stored().old?.ownedIds).toEqual(['q']))
  await waitFor(() => expect(Object.keys(mock.rows)).toEqual(['old']))
})

test('un-marking and deleting on another device propagate after the first sync', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x', 'y'] }), testList('gone', 'Old list')])
  signIn()
  renderSection()
  await waitFor(() => expect(status()).toHaveTextContent('Last synced'))
  // Another device un-marks y and deletes "Old list".
  mock.rows = { a: testList('a', 'Mine', { ownedIds: ['x'] }), gone: null }
  fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))
  await waitFor(() => expect(stored().a.ownedIds).toEqual(['x']))
  expect(stored().gone).toBeUndefined()
})

test('a local change is pushed automatically a moment later', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] })])
  signIn()
  renderSection()
  await waitFor(() => expect(status()).toHaveTextContent('Last synced'))
  const before = mock.pushes.length
  act(() => setLists((lists) => ({ ...lists, a: { ...lists.a, ownedIds: [] } })))
  await waitFor(() => expect(mock.pushes.length).toBe(before + 1), { timeout: 4000 })
  expect((mock.rows.a as PokemonList).ownedIds).toEqual([])
})

test('a failed sync says so, retries later and changes nothing', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] })])
  signIn()
  mock.pullError = new Error('network down')
  renderSection()
  await waitFor(() => expect(status()).toHaveTextContent('Sync failed: network down. Retrying automatically.'))
  expect(stored().a.ownedIds).toEqual(['x'])
  expect(mock.pushes).toEqual([])
  expect(screen.getByRole('status', { name: 'Cloud sync: Sync error' })).toBeInTheDocument()
})

test('offline: nothing is pulled and the status says changes wait for the network', async () => {
  vi.stubGlobal('navigator', { ...navigator, onLine: false })
  seedState([testList('a', 'Mine')])
  signIn()
  renderSection()
  await waitFor(() => expect(status()).toHaveTextContent('Offline'))
  expect(cloud.pullListRows).not.toHaveBeenCalled()
})

test('signed out: no header indicator', async () => {
  renderSection()
  await screen.findByRole('button', { name: 'Send magic link' })
  expect(screen.queryByRole('status', { name: /Cloud sync/ })).not.toBeInTheDocument()
})

// ---- 3.44 account data ----
test('a privacy note is there signed in and signed out', async () => {
  renderSection()
  await screen.findByRole('button', { name: 'Send magic link' })
  fireEvent.click(screen.getByText('Privacy'))
  expect(screen.getByText(/No ads, no tracking/)).toBeVisible()
})

async function openDelete() {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] })])
  signIn()
  renderSection()
  await waitFor(() => expect(status()).toHaveTextContent('Last synced'))
  fireEvent.click(screen.getByRole('button', { name: 'Delete account…' }))
  return screen.getByRole('dialog', { name: 'Delete your account?' })
}

test('deleting the account needs the word DELETE, keeps this device\'s lists and forgets the sync copy', async () => {
  const dialog = await openDelete()
  const confirm = within(dialog).getByRole('button', { name: 'Delete account' })
  expect(confirm).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } })
  expect(confirm).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } })
  fireEvent.click(confirm)
  await waitFor(() => expect(cloud.deleteAccount).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(window.localStorage.getItem('living-dex:sync-base')).toBeNull()
  expect(stored().a.ownedIds).toEqual(['x'])
})

test('the delete dialog offers an export first; Cancel deletes nothing', async () => {
  const dialog = await openDelete()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Export a backup first' }))
  expect(onExport).toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(cloud.deleteAccount).not.toHaveBeenCalled()
})

test('a failed delete says so and keeps the dialog open', async () => {
  mock.deleteError = new Error('permission denied')
  const dialog = await openDelete()
  fireEvent.change(within(dialog).getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not delete the account: permission denied')
  expect(window.localStorage.getItem('living-dex:sync-base')).not.toBeNull()
})
