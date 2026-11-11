import { DEFAULT_LIST_FILTER, DEFAULT_USER_STATE, type PokemonList, type UserState } from '@living-dex/business-logic'

// Since 3.19 no list is created implicitly (the start wizard creates them), so tests that need a list
// seed one into storage before rendering.
export const STORAGE_KEY = 'living-dex:user-state'

export function testList(id: string, name: string, extra: Partial<PokemonList> = {}): PokemonList {
  return {
    id,
    name,
    createdAt: `2026-01-01T00:00:0${id.length % 10}.000Z`,
    dataVersion: 'v1',
    variant: 'normal',
    filter: DEFAULT_LIST_FILTER,
    ownedIds: [],
    ...extra,
  }
}

/** Writes a state with the given lists (the first one active) over the defaults. */
export function seedState(lists: PokemonList[], overrides: Partial<UserState> = {}): void {
  const state: UserState = {
    ...DEFAULT_USER_STATE,
    lists: Object.fromEntries(lists.map((l) => [l.id, l])),
    activeListId: lists[0]?.id ?? null,
    ...overrides,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const seedDefaultList = (extra: Partial<PokemonList> = {}) => seedState([testList('seed', 'My Living Dex', extra)])
