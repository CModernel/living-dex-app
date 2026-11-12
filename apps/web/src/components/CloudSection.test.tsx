import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { UserStateProvider } from '../state/UserStateContext'
import { seedState, STORAGE_KEY, testList } from '../test/seed'
import CloudSection from './CloudSection'

const mock = vi.hoisted(() => ({
  configured: true,
  session: null as null | { user: { id: string; email: string } },
  remote: [] as unknown[],
  pushed: null as unknown,
  pullError: null as Error | null,
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
  pullLists: vi.fn(async () => {
    if (mock.pullError) throw mock.pullError
    return mock.remote
  }),
  pushLists: vi.fn(async (_id: string, lists: unknown) => {
    mock.pushed = lists
  }),
}))

import * as cloud from '../lib/cloud'

const renderSection = () =>
  render(
    <UserStateProvider>
      <CloudSection />
    </UserStateProvider>,
  )

beforeEach(() => {
  window.localStorage.clear()
  Object.assign(mock, { configured: true, session: null, remote: [], pushed: null, pullError: null })
})
afterEach(() => window.localStorage.clear())

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

test('Sync now merges the cloud into this device and uploads the merged lists, never losing owned', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] })])
  mock.session = { user: { id: 'user-1', email: 'ash@example.com' } }
  mock.remote = [testList('a', 'Mine', { ownedIds: ['y'] }), testList('b', 'From phone', { ownedIds: ['z'] })]
  renderSection()
  expect(await screen.findByText('ash@example.com')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Last synced'))
  const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)
  expect([...stored.lists.a.ownedIds].sort()).toEqual(['x', 'y'])
  expect(stored.lists.b.ownedIds).toEqual(['z'])
  const pushed = mock.pushed as Record<string, { ownedIds: string[] }>
  expect(Object.keys(pushed).sort()).toEqual(['a', 'b'])
  expect([...pushed.a.ownedIds].sort()).toEqual(['x', 'y'])
})

test('a failed sync says so and changes nothing', async () => {
  seedState([testList('a', 'Mine', { ownedIds: ['x'] })])
  mock.session = { user: { id: 'user-1', email: 'ash@example.com' } }
  mock.pullError = new Error('network down')
  renderSection()
  fireEvent.click(await screen.findByRole('button', { name: 'Sync now' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Sync failed: network down'))
  expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).lists.a.ownedIds).toEqual(['x'])
  expect(mock.pushed).toBeNull()
})
