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
