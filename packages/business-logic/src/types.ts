export type ListFilter = {
  finalStageOnly: boolean;
  regionalFormsOnly: boolean;
  hideGenderVariants: boolean;
  // Hides entries obtainable in none of the selected games (UserPreferences.excludedGameIds).
  hideInaccessible: boolean;
};

export type PokemonList = {
  id: string;
  name: string;
  // Collections: optional emoji shown next to the name. Optional so older saved lists keep working.
  icon?: string;
  createdAt: string;
  dataVersion: 'v1';
  variant: 'normal' | 'shiny';
  filter: ListFilter;
  ownedIds: string[];
  // 3.7b: which game(s) each owned entry was obtained from — sparse (slug → game ids in release
  // order), only for entries with at least one tag. Optional: lists saved before 3.7b lack it.
  // Kept consistent by owned.ts: a tagged slug is always in `ownedIds`.
  ownedGames?: Record<string, string[]>;
};

export type UserPreferences = {
  visibleColumns: string[];
  columnOrder: string[];
  columnSizing: Record<string, number>;
  compactMode: boolean;
  darkMode?: 'system' | 'light' | 'dark';
  // Set once the user dismisses the Home welcome card (3.8 #13). Optional: absent means not yet.
  welcomeDismissed?: boolean;
  // Preferences schema version: lets reconcilePreferences run one-off migrations on stored state.
  // 1 = `types` became a hideable column (stored states from before it keep it visible).
  prefsVersion?: number;
  // Games the user deselected in the Filters menu (ids from availability.ts GAMES). Stored as
  // the deselected set so every game, including ones added later, is selected by default.
  excludedGameIds: string[];
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
    // (2026-08-28); `types`, `box` and `slot` start hidden since 2026-11-12 (UI polish) like every other
    // hideable column.
    visibleColumns: ['dex'],
    // Deliberately NOT `[]` even though TanStack's columnOrderingFeature treats an empty array
    // as "natural definition order" for rendering purposes — HomePage's own `reorderColumns`
    // logic reads and rewrites this array directly (so a hidden column's position is preserved
    // across a drag), and needs real ids to compute indices against, not an empty list.
    columnOrder: ['sprite', 'dex', 'name', 'species', 'types', 'box', 'slot', 'position', 'generation', 'region', 'availability', 'evolutionStage', 'owned'],
    // Relative column weights (not pixels), keyed by column id. Empty is safe: a missing entry
    // falls back to DEFAULT_COLUMN_WEIGHTS in apps/web/src/lib/columnWeights.ts.
    columnSizing: {},
    compactMode: false,
    darkMode: 'system',
    excludedGameIds: [],
    prefsVersion: 1,
  },
};

export const DEFAULT_LIST_FILTER: ListFilter = {
  finalStageOnly: false,
  regionalFormsOnly: false,
  hideGenderVariants: false,
  hideInaccessible: false,
};
