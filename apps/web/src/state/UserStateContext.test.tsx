import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { UserStateProvider, useUserState } from './UserStateContext'

const STORAGE_KEY = 'living-dex:user-state'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

function TestConsumer() {
  const [state, setState] = useUserState()
  return (
    <div>
      <span data-testid="active-list-id">{state.activeListId ?? 'none'}</span>
      <button type="button" onClick={() => setState((prev) => ({ ...prev, activeListId: 'list-1' }))}>
        set active list
      </button>
    </div>
  )
}

test('loads DEFAULT_USER_STATE when nothing is persisted', async () => {
  render(
    <UserStateProvider>
      <TestConsumer />
    </UserStateProvider>,
  )

  await waitFor(() => expect(screen.getByTestId('active-list-id')).toHaveTextContent('none'))
})

test('loads previously persisted state from localStorage', async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lists: {}, activeListId: 'existing-list', preferences: { visibleColumns: [], compactMode: false } }),
  )

  render(
    <UserStateProvider>
      <TestConsumer />
    </UserStateProvider>,
  )

  await waitFor(() => expect(screen.getByTestId('active-list-id')).toHaveTextContent('existing-list'))
})

test('writes state changes back to localStorage', async () => {
  render(
    <UserStateProvider>
      <TestConsumer />
    </UserStateProvider>,
  )
  await waitFor(() => expect(screen.getByTestId('active-list-id')).toHaveTextContent('none'))

  act(() => screen.getByRole('button', { name: /set active list/i }).click())

  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored.activeListId).toBe('list-1')
  })
})

function ListsConsumer() {
  const [state] = useUserState()
  const lists = Object.values(state.lists)
  return (
    <div>
      <span data-testid="count">{lists.length}</span>
      <span data-testid="owned">{lists[0]?.ownedIds.join(',') ?? ''}</span>
      <span data-testid="games">{JSON.stringify(lists[0]?.ownedGames ?? null)}</span>
    </div>
  )
}

const savedList = {
  id: 'a',
  name: 'Saved',
  createdAt: '2026-01-01T00:00:00.000Z',
  dataVersion: 'v1',
  variant: 'normal',
  filter: { finalStageOnly: false, regionalFormsOnly: false, hideGenderVariants: false, hideInaccessible: false },
  ownedIds: ['bulbasaur', 'ivysaur'],
  ownedGames: { bulbasaur: ['red'] },
}

test('hydrates persisted lists, owned ids and per-game tags', async () => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lists: { a: savedList }, activeListId: 'a', preferences: { visibleColumns: [], compactMode: false } }),
  )

  render(
    <UserStateProvider>
      <ListsConsumer />
    </UserStateProvider>,
  )

  await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  expect(screen.getByTestId('owned')).toHaveTextContent('bulbasaur,ivysaur')
  expect(screen.getByTestId('games')).toHaveTextContent('{"bulbasaur":["red"]}')
})

test('mounting does not overwrite persisted data with defaults before hydration finishes', async () => {
  const persisted = JSON.stringify({
    lists: { a: savedList },
    activeListId: 'a',
    preferences: { visibleColumns: [], compactMode: false },
  })
  window.localStorage.setItem(STORAGE_KEY, persisted)

  render(
    <UserStateProvider>
      <ListsConsumer />
    </UserStateProvider>,
  )

  // Synchronously after mount, hydration has not resolved: storage must still hold the original.
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(persisted)
  await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
  expect(stored.lists.a.ownedIds).toEqual(['bulbasaur', 'ivysaur'])
})
