import type { TierId } from './layout.js'

export type ListFilter = {
  finalStageOnly: boolean;
  regionalFormsOnly: boolean;
  hideGenderVariants: boolean;
  // Hides entries obtainable in none of the selected games (ListSettings.excludedGameIds).
  hideInaccessible: boolean;
};

// 3.35: the grid keeps its own visibility, independent of the table's (`list.filter`, `showFutureSlots`).
export type GridSettings = {
  // Defaults to true: the grid shows every reserved slot of the planned tier.
  showFutureSlots?: boolean;
  // Defaults to DEFAULT_LIST_FILTER (nothing hidden); keys missing in a stored filter fall back to it.
  filter?: Partial<ListFilter>;
};

// 3.36: view and visibility settings that belong to one list (each list keeps its own). Every key is optional:
// absent means the default in DEFAULT_LIST_SETTINGS. Columns, density and theme stay per user (UserPreferences).
export type ListSettings = {
  // Home shows the table or HOME-style boxes (3.18).
  viewMode?: 'table' | 'grid';
  // 3.19b: show the greyed rows of a bigger planned tier with their real Box/Slot.
  showFutureSlots?: boolean;
  // Games deselected in the Filters menu (ids from availability.ts GAMES), stored as the deselected set so every
  // game, including ones added later, is selected by default.
  excludedGameIds?: string[];
  grid?: GridSettings;
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
  // 3.36: per-list view settings. Optional: lists saved before it lack it (defaults apply).
  settings?: ListSettings;
  ownedIds: string[];
  // 3.7b: which game(s) each owned entry was obtained from — sparse (slug → game ids in release
  // order), only for entries with at least one tag. Optional: lists saved before 3.7b lack it.
  // Kept consistent by owned.ts: a tagged slug is always in `ownedIds`.
  ownedGames?: Record<string, string[]>;
  // 3.19: working tier and the tier whose full order defines Box/Slot. Optional: lists saved before 3.19
  // lack both and resolve to Living Form (see resolveListTiers in layout.ts).
  tier?: TierId;
  layoutTier?: TierId;
};

export type UserPreferences = {
  visibleColumns: string[];
  columnOrder: string[];
  columnSizing: Record<string, number>;
  compactMode: boolean;
  darkMode?: 'system' | 'light' | 'dark';
  // 3.31: the Home sidebar is folded to a narrow rail on desktop. Optional: absent = expanded.
  sidebarCollapsed?: boolean;
  // Set once the user dismisses the Home welcome card (3.8 #13). Optional: absent means not yet.
  welcomeDismissed?: boolean;
  // Preferences schema version: lets reconcilePreferences run one-off migrations on stored state.
  // 1 = `types` became a hideable column (stored states from before it keep it visible).
  prefsVersion?: number;
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
    prefsVersion: 1,
  },
};

export const DEFAULT_LIST_FILTER: ListFilter = {
  finalStageOnly: false,
  regionalFormsOnly: false,
  hideGenderVariants: false,
  hideInaccessible: false,
};

// Settings with every key resolved (see resolveListSettings).
export type ResolvedListSettings = Required<Omit<ListSettings, 'grid'>> & {
  grid: { showFutureSlots: boolean; filter: ListFilter };
};

export const DEFAULT_LIST_SETTINGS: ResolvedListSettings = {
  viewMode: 'table',
  showFutureSlots: false,
  excludedGameIds: [],
  grid: { showFutureSlots: true, filter: DEFAULT_LIST_FILTER },
};
