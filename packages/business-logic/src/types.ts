export type ListFilter = {
  finalStageOnly: boolean;
  regionalFormsOnly: boolean;
  hideGenderVariants: boolean;
};

export type PokemonList = {
  id: string;
  name: string;
  createdAt: string;
  dataVersion: 'v1';
  variant: 'normal' | 'shiny';
  filter: ListFilter;
  ownedIds: string[];
};

export type UserPreferences = {
  visibleColumns: string[];
  compactMode: boolean;
  darkMode?: 'system' | 'light' | 'dark';
};

export type UserState = {
  lists: Record<string, PokemonList>;
  activeListId: string | null;
  preferences: UserPreferences;
};

export const DEFAULT_USER_STATE: UserState = {
  lists: {},
  activeListId: null,
  preferences: {
    visibleColumns: ['name', 'types', 'owned'],
    compactMode: false,
    darkMode: 'system',
  },
};

export const DEFAULT_LIST_FILTER: ListFilter = {
  finalStageOnly: false,
  regionalFormsOnly: false,
  hideGenderVariants: false,
};
