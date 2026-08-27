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
    // Only names the HIDEABLE columns that start visible (`sprite`/`name`/`types`/`owned`
    // are always shown regardless of this list — see HIDEABLE_COLUMN_IDS in
    // apps/web/src/hooks/useColumnVisibility.ts) — none of them do, matching the table's
    // pre-3.5 hardcoded default.
    visibleColumns: [],
    compactMode: false,
    darkMode: 'system',
  },
};

export const DEFAULT_LIST_FILTER: ListFilter = {
  finalStageOnly: false,
  regionalFormsOnly: false,
  hideGenderVariants: false,
};
