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
  columnOrder: string[];
  columnSizing: Record<string, number>;
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
    // apps/web/src/hooks/useColumnVisibility.ts). `dex` starts visible per user request
    // (2026-08-28) — every other hideable column still starts hidden.
    visibleColumns: ['dex'],
    // Deliberately NOT `[]` even though TanStack's columnOrderingFeature treats an empty array
    // as "natural definition order" for rendering purposes — HomePage's own `reorderColumns`
    // logic reads and rewrites this array directly (so a hidden column's position is preserved
    // across a drag), and needs real ids to compute indices against, not an empty list.
    columnOrder: ['sprite', 'name', 'types', 'dex', 'generation', 'region', 'evolutionStage', 'owned'],
    // Empty is safe here (unlike columnOrder's default above) — nothing in this codebase reads
    // or rewrites columnSizing directly; a missing entry just falls back to its column's own
    // declared `size` in HomePage.tsx, exactly like TanStack's own internal default resolution.
    columnSizing: {},
    compactMode: false,
    darkMode: 'system',
  },
};

export const DEFAULT_LIST_FILTER: ListFilter = {
  finalStageOnly: false,
  regionalFormsOnly: false,
  hideGenderVariants: false,
};
