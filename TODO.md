# TODO

App (web + mobile) implementation roadmap. Organized by **macro phases** (setup → structures → features),
not feature-by-feature. Every phase must complete before the next starts.

See `living-dex-organizer/TODO.md` for data pipeline and infrastructure items.

## Testing Convention

**Every TODO item must explicitly state what type(s) of tests it includes.** Pick from:
- **Unit tests** — pure logic, mocked dependencies (fast, no UI/network)
- **Integration tests** — multiple components/systems together (e.g., data fetch + storage layer)
- **UI tests** — React component rendering, user interactions (Vitest + Testing Library for web;
  Detox/Maestro planned for mobile)
- **E2E tests** — full user flow end-to-end (e.g., open app → fetch data → fill form → export →
  verify file)

Example: "**1.2 Dataset fetching — Unit tests**: mock fetch, verify caching, sprite URL logic."
Or: "**#20 Main table — Unit tests (table logic) + UI tests (column sorting, row clicks).**"

This prevents surprise gaps like "the feature works in unit tests but breaks in the real app" or
"nobody tested mobile UI on landscape."

## Phase 1: Setup & Plataforms (Foundation)

**Goal:** Frameworks, libraries, monorepo wiring, and both apps running with no errors.

- [x] **1.1 Monorepo wiring complete.** ✅ Workspaces, TypeScript paths, tier predicates imported successfully.
      - Monorepo with npm workspaces (apps/web, apps/mobile, packages/business-logic)
      - `@cmodernel/living-dex-tiers` imported as `file:` dependency in both apps
      - Verified monorepo can build + import across boundaries
      **Tests: Integration** (verify monorepo can build + import across boundaries; no UI/E2E needed).

- [x] **1.2 Dataset fetching module.** ✅ Complete with in-memory caching and sprite URL logic.
      - `fetchDataset()` function (async, jsDelivr CDN URL)
      - `PokemonEntry` TypeScript type (mirrors JSON shape from `data/v1/living-form-full-data.json`)
      - `getSpriteUrl()` URL reconstruction with default/shiny/female/shiny-female variants
      - In-memory caching to avoid refetch
      - 9 unit tests pass (mock fetch, caching, sprite URLs, error handling)
      **Tests: Unit** (mock fetch, verify caching, sprite URL logic, error handling).

- [x] **1.3 Web app verified to build & deploy locally.** ✅ Builds cleanly, tests pass.
      - `npm run build -w apps/web` produces valid dist/
      - `npm run test -w apps/web` passes (Vitest + Testing Library)
      - Dev server (`npm run dev -w apps/web`) starts clean on localhost:5182
      **Tests: Integration** (dev server startup, build artifacts, existing test suite).

- [x] **1.4 Mobile app verified to start.** ✅ Migrated Expo 57 → 54, verified on iPhone 12 physical device via Expo Go.
      - `npm run start -w apps/mobile` (Expo dev server) starts clean
      - Can preview in Expo Go (physical iPhone 12) — confirmed working
      - No TypeScript errors, SafeAreaView deprecation cleaned
      **Tests: Integration** (dev server startup, physical device launch).

- [x] **1.5 GitHub Pages CI/CD wired for web app.** ✅ Workflow created, base URL configured.
      - `.github/workflows/deploy-web.yml` — build + deploy to GitHub Pages via actions/deploy-pages
      - `apps/web/vite.config.ts` has `base: '/living-dex-app/'` (repo name path)
      - Workflow triggers on push to main, builds web app, deploys to gh-pages
      - Ready for manual test: merge to main → workflow runs → site live at https://cmodernel.github.io/living-dex-app/
      **Tests: E2E** (workflow execution on next merge to main).

**Phase 1 complete when:** ✅ All 5 items done — both dev servers run, tests pass, web deploys to GH Pages (workflow ready).

---

## Phase 2: Structures & Basics (Scaffolding)

**Goal:** Component/screen base, routing, theme, storage wiring — everything "empty" but connected.

- [x] **2.1 Web app routing & layout shell.** ✅ react-router v7 wired, 3 routes + layout shell.
      - Installed `react-router` v7 (React 19 compatible)
      - `Layout` component: header + nav (Home/Lists/Settings), footer stub, `<Outlet />`
      - Routes: `/` (HomePage placeholder), `/lists` (ListsPage), `/settings` (SettingsPage)
      - `AppRoutes` kept separate from `<BrowserRouter>` so tests can use `<MemoryRouter>`
      - GitHub Pages SPA deep-link fix: `public/404.html` + restoration script in `index.html`
      (standard rafgraph/spa-github-pages trick, needed since `BrowserRouter` + `basename` requires
      server rewrites GH Pages doesn't provide)
      - Along the way: fixed a monorepo react/react-dom duplicate-instance bug (react-router was
      hoisted to the workspace root while react/react-dom stayed nested per-workspace due to the
      apps/mobile react version pin, so Node module resolution for react-router walked past the
      repo root into an unrelated ancestor directory's react copy). First patched by hoisting a
      shared react/react-dom copy to the workspace root; later fully resolved in 2.2 by pinning
      React to one exact version across the whole monorepo (see 2.2 notes)
      **Tests: UI** (HomePage/ListsPage/SettingsPage/Layout render assertions) **+ Integration**
      (`AppRoutes.test.tsx` verifies `/`, `/lists`, `/settings` each render the correct page via
      `MemoryRouter`). 8/8 tests passing.

- [x] **2.2 Mobile app routing ready.** ✅ React Navigation (bottom tabs), verified on physical iPhone 12.
      - Expo Router was removed during 1.4 (part of the SDK 57→54 migration); chose React Navigation
      instead for 2.2 — more stable in Expo Go 54, no file-based-routing/Babel-plugin surface area
      - `RootNavigator` (bottom tabs): Home / Lists / Settings, `@expo/vector-icons` tab icons
      - Placeholder screens mirroring the web routes (HomeScreen, ListsScreen, SettingsScreen)
      - **Root-caused a recurring "Invalid hook call" / duplicate-React crash** hit while wiring
      this up: `react-native@0.81.5` hard-requires an exact-matching `react@19.1.0` (its bundled
      `react-native-renderer` is compiled against that one version, no tolerance for a different
      patch); meanwhile `apps/web` had drifted to `react@^19.2.8`, and packages hoisted to the
      workspace root (`@expo/vector-icons`, `@react-navigation/*`) resolved whichever copy was
      nearest in the (per-workspace-inconsistent) node_modules tree — sometimes a different
      instance than the one `react-native` itself used. `metro.config.js`'s custom
      `resolver.nodeModulesPaths` did NOT fix this (Metro's hierarchical per-importer walk finds a
      root-hoisted package's nearest `react` before consulting that config). Fixed for good by
      pinning React to one exact version (`19.1.0`, matching `react-native`'s hard requirement)
      across the entire monorepo (root, `apps/web`, `apps/mobile`) — confirmed a single physical
      `node_modules/react` afterward, no nested duplicates anywhere
      - Verified end-to-end on physical iPhone 12 via Expo Go: bottom tabs render, navigation
      between Home/Lists/Settings works with no errors
      **Tests: Integration** (Metro bundle export verified clean; manual navigation test on
      physical device — Detox/Maestro automated UI tests for mobile are a future TODO, not yet
      set up per the Testing Convention's mobile UI-test caveat).

- [x] **2.3 Theme/styling foundation (both platforms).** ✅ Shared token set, verified visually + on device.
      - **Web:** Color tokens (`background`/`foreground`/`muted`/`border`/`brand`) defined via
      Tailwind v4 `@theme` in `index.css`, with `@custom-variant dark` for class-based dark mode
      (not just OS `prefers-color-scheme`). `useDarkMode` hook seeds from OS preference, toggle
      button in `Layout` header flips a `.dark` class on `<html>` — verified visually in-browser
      (light↔dark screenshots). No persistence yet (per TODO note, wired to #19 later).
      - **Mobile:** `src/theme/theme.ts` mirrors the same color tokens (+ spacing/typography
      scales); `ThemeContext`/`useTheme()` picks light/dark via `useColorScheme()`. Wired into
      `RootNavigator`'s `NavigationContainer` theme (tab bar colors) and all 3 placeholder screens.
      Verified: typecheck clean, Metro bundle export clean.
      **Tests: UI** (`useDarkMode.test.ts` — toggle flips state + DOM class; `Layout.test.tsx` —
      toggle button renders and switches the theme class) **+ manual visual verification** (browser
      screenshots showing both themes render correctly).

- [x] **2.4 Storage wiring in business-logic.** ✅ Platform-agnostic adapter + React context both sides.
      - `storage.ts` refactored to `createUserStateStorage(adapter)` — takes a `StorageAdapter`
      (`getItem`/`setItem`) instead of hardcoding `localStorage`, since that global doesn't exist in
      React Native. Fixed a latent bug along the way: internal imports (`./types`, and `index.ts`'s
      re-exports) were missing `.js` extensions, which silently broke Node's native ESM resolution
      the moment anything actually exercised those import paths (never caught before — nothing had
      imported through `index.ts`/`storage.ts` until now)
      - Both `apps/web` and `apps/mobile` now depend on `@living-dex/business-logic` for real (npm
      workspace symlink) — first actual runtime usage of that package outside `packages/business-logic`
      itself
      - **Web:** `UserStateProvider`/`useUserState()` in `apps/web/src/state/`, adapter wraps
      `localStorage`
      - **Mobile:** same pattern in `apps/mobile/src/state/`, adapter wraps `@react-native-async-storage/async-storage`
      directly (its API already matches `StorageAdapter`'s shape)
      - Both providers guard against a race: the "persist on state change" effect is gated on an
      `hydrated` flag so it can't fire with `DEFAULT_USER_STATE` before the initial load completes
      and clobber whatever was already persisted
      - Verified end-to-end on physical iPhone 12 (AsyncStorage's first real runtime exercise —
      app still boots and navigates cleanly)
      **Tests: Unit** (`storage.test.ts` — 5 tests, fake in-memory adapter) **+ Integration**
      (`UserStateContext.test.tsx` — load/persist round-trip against a real Storage-shaped mock,
      3 tests) **+ manual device verification**.

- [x] **2.5 Tier-logic import verified (both platforms).** ✅ `apps/mobile/src/tiers.test.ts` added
      (mirrors `apps/web/src/tiers.test.ts` from 1.1, now runnable via 2.6's Jest setup).
      - Both `apps/web` and `apps/mobile` import `{ TIERS }` from `@cmodernel/living-dex-tiers`
      without errors
      - Tests in both apps exercise the import and verify all 4 tier names

- [x] **2.6 Unit test setup verified (both platforms).** ✅ Mobile test runner stood up from scratch.
      - **Web:** Vitest + Testing Library (already configured; #1.3 verifies).
      - **Mobile:** `jest-expo` + `@testing-library/react-native` + `react-test-renderer` (all
      pinned to versions that actually work together — see below). 2 tests pass
      (`tiers.test.ts` + a `HomeScreen` render test).
      - Found and fixed two real bugs along the way:
        1. `babel-preset-expo` was still pinned to the old `~11.0.5` version scheme (a leftover
        from an early-session hack, well before Expo SDK 54 switched this package to match its own
        `54.x` version numbers) — this old version couldn't parse newer Flow syntax
        (`ref as string` casts) present in `react-native@0.81.5`'s own `jest/mock.js`, breaking
        every mobile test suite before any test code even ran. Bumped to `~54.0.12`.
        2. `@testing-library/react-native@14.x` (New Architecture-oriented, needs a `test-renderer`
        setup jest-expo doesn't provide out of the box) silently broke `render()`'s returned
        queries. Downgraded to the widely-supported `^12.9.0` line, paired with
        `react-test-renderer` pinned to the exact same React version as everything else in the
        monorepo (`19.1.0`) — the same "must match exactly" constraint discovered for `react-dom`
        in 2.2.
      - Root `npm run test` (business-logic + web + mobile) now runs end-to-end for the first time:
      29 tests total, all passing.
      **Tests: Unit + UI** (`tiers.test.ts`, `HomeScreen.test.tsx`).

**Phase 2 complete when:** ✅ All 6 items done — both apps compile, routing works, storage layer
ready, themed, tested, no feature code yet.

---

## Phase 3: Features (Building the app)

After Phase 2, implement the actual feature list. Refined into single-sitting-sized tasks (each
task = one implementation + one local test cycle, per the user's explicit preference) — feature
IDs (`#20`, `#11`, etc.) trace back to `living-dex-organizer/TODO.md`'s numbering and never change,
even if the `3.X` task order below does.

**Decisions locked in for the first table task** (confirmed with the user before starting):
- Owned-state persists for real from day one — auto-create one default `PokemonList` (tier
  `living-form`, standard `DEFAULT_LIST_FILTER`) the first time the app loads with no lists yet.
  Becomes "the user's first list" once #16 (list switcher) lands, no rework needed.
- Default/fixed tier until #30's selector exists: `living-form` (full ~1387-entry set).
- Sprite column included from the start (`getSpriteUrl()` already tested in 1.2), not deferred.

### Foundation
- [x] **3.1 Dataset loading hook (web).** ✅ `apps/web/src/hooks/useDataset.ts` wraps
      `fetchDataset()` from `@living-dex/business-logic` in a `{ dataset, loading, error }` hook.
      **Tests: Unit** (`useDataset.test.ts` — mock fetch, loading→success and loading→error
      transitions, 2 tests).

- [x] **3.2 #20 — Main spreadsheet table.** ✅ `HomePage.tsx` renders the `living-form` tier via
      `TIERS['living-form'].predicate`. Columns: sprite (`getSpriteUrl`), name, types, owned
      checkbox. Owned checkbox reads/writes `useUserState()`'s active list `ownedIds`, via a new
      `useActiveList()` hook that auto-creates the default list per the locked-in decision above.
      - Used a plain HTML `<table>` instead of TanStack Table for this first pass: TanStack Table
      v9 (already installed) turned out to have a substantially different, more complex API than
      v8 (`useTable` + `TableFeatures` config instead of `useReactTable` + `getCoreRowModel`), and
      this first table has no sorting/customization yet to justify that complexity. TanStack Table
      gets introduced starting at 3.4 (customizable columns), where its column-visibility API is
      actually needed.
      - Found and fixed two real bugs along the way:
        1. `@cmodernel/living-dex-tiers` ships no `.d.ts` (plain JS package) — added an ambient
        `apps/web/src/types/living-dex-tiers.d.ts` declaration so `tsc -b` (production build)
        can type-check `TIERS` usage (previously only tolerated by excluding test files from the
        build, per the 1.5 CI fix — that exclusion is now only needed for genuinely test-only
        code, not for this now-typed production import).
        2. Vite's **dev server** (not the production build) failed to load
        `@cmodernel/living-dex-tiers` at all — `ReferenceError: module is not defined`. Root
        cause: Vite treats a `file:` dependency symlinked from *outside* `node_modules` (this
        package lives in the sibling `living-dex-organizer` repo) as project source rather than a
        dependency to pre-bundle, so it skips CJS→ESM interop entirely and serves the raw
        CommonJS file as native ESM. Fixed via `apps/web/vite.config.ts`'s
        `optimizeDeps.include: ['@cmodernel/living-dex-tiers']`, forcing it through esbuild's
        pre-bundling (which does the CJS interop correctly) like a normal dependency.
      - Verified visually in-browser with the real dataset (via jsDelivr): table renders,
      sprites/names/types display correctly, toggling the owned checkbox persists to
      `localStorage` and survives a full page reload.
      **Tests: Unit + UI** (`HomePage.test.tsx` — loading/error states, tier-predicate filtering
      excludes a gender-variant fixture entry, checkbox toggle persists; `AppRoutes.test.tsx` and
      `HomePage.test.tsx`/`Layout.test.tsx` updated for the new data-fetching HomePage) **+ manual
      browser verification** (real dataset, persistence across reload).

- [x] **3.3 #30 — Tier predicate selector.** ✅ Dropdown switching between the 4 `TIERS`, wired
      into 3.2's filtering.
      - `HomePage.tsx`: `TierId` state (default `living-form`), `<select>` with human-readable
      labels, filters `entries` via `TIERS[tierId].predicate` instead of a hardcoded tier.
      - Verified visually in-browser: switching to "Final Form" correctly drops pre-evolution
      entries (Bulbasaur) and keeps final-stage ones (Venusaur, Charizard, Blastoise, ...).
      **Tests: UI** (`HomePage.test.tsx` — switching the selector changes which rows render,
      using a fixture entry that only survives the Final Form predicate). 19/19 web tests passing.

- [x] **3.3b Web table UX polish.** ✅ User-requested batch of small interaction/visual fixes
      after using 3.2/3.3 for real.
      - `cursor-pointer` on the dark-mode toggle and the tier `<select>` (buttons/selects don't
      get a pointer cursor by default).
      - Clicking anywhere in a table row toggles owned, not just the small checkbox — checkbox
      keeps its own `onClick` with `stopPropagation()` so it doesn't double-toggle when clicked
      directly (verified with a dedicated test).
      - Owned rows get a `bg-brand/15` highlight.
      - Sprites bumped to 48px (web only — mobile sprite size is separate, see 3.10 notes below).
      - Hover tooltip showing a larger (96px) sprite — pure CSS (`group`/`group-hover`), no JS
      tooltip library. Hit a real bug along the way: Tailwind's preflight sets
      `img { max-width: 100%; height: auto }`, which shrank the enlarged tooltip image to fit its
      container; fixed with an explicit inline `style` (wins over any stylesheet rule regardless
      of specificity) instead of the `width`/`height` HTML attributes alone.
      - Types render as colored badges (`TypeBadge` component, standard Pokémon type color map in
      `lib/pokemonTypeColors.ts`) instead of a plain comma-joined text string — no new icon-asset
      dependency added; real icon graphics can replace this later if wanted (the user referenced
      a prior app's icon set that isn't available in this environment).
      **Tests: UI** (`TypeBadge.test.tsx`; `HomePage.test.tsx` — row click toggles owned, and a
      dedicated test confirming the checkbox's own click doesn't double-toggle via the row
      handler). 22/22 web tests passing. Verified visually in-browser (screenshots) for all of the
      above, including the tooltip fix.

### Columns & Preferences
- [x] **3.4 #11 — Customizable columns.** ✅ First real use of TanStack Table v9 in this repo.
      - `HomePage.tsx` rewritten with `useTable`/`createColumnHelper` (v9's API, meaningfully
      different from v8 — no `getCoreRowModel` table option anymore, features are opt-in via
      `tableFeatures({ columnVisibilityFeature })`, `ColumnDef` needs an extra `TFeatures`
      generic). Researched from the installed package's own `.d.ts` files and bundled
      `skills/*/SKILL.md` guides before writing any code (plan mode) — avoided guessing at an
      unfamiliar, versioned API.
      - New optional columns, hidden by default: Dex # (`dex`), Generation (`generation`), Region
      (`region`, falls back to `—`), Stage (`evolutionStage`). Sprite/Name/Types/Owned stay
      `enableHiding: false` — always visible, matching the pre-3.4 baseline table exactly until a
      user opts in.
      - New `ColumnVisibilityMenu.tsx` — a `<details>`/`<summary>` disclosure listing hideable
      columns, no new dependency/custom popover needed.
      - Hit a real TypeScript limitation: `ColumnDef` is invariant in its value-type generic
      (`footer`/`cell` templates appear in both producer and consumer position), so a
      heterogeneous array of columns with different value types (string/number/unknown) can't
      structurally satisfy `ColumnDef<Features, Data, unknown>[]` even though it's fine at
      runtime — fixed with an explicit `as ColumnDef<..., any>[]` cast, the standard escape hatch
      for this known class of TS limitation.
      - Found and fixed a real (if low-probability-in-practice) bug while chasing a flaky test:
      `useActiveList`'s `toggleOwned` assumed the "auto-create a default list" mount effect had
      already run, silently dropping a click that landed before it did (e.g. right as the
      dataset resolves). Made `toggleOwned` create the list inline if needed instead of relying
      on the effect's timing — atomic and correct regardless of race. Also hardened several tests
      that captured a checkbox `await`-then-clicked-later: TanStack's row/cell rendering can
      recreate cell elements across state changes, so a captured DOM reference can go stale
      between the `await` and the click — now query-and-click happen in the same statement.
      - Verified visually in-browser: toggled each optional column on/off (values render/disappear
      correctly), confirmed the always-visible columns aren't offered in the menu, confirmed row
      click / tier selector / hover tooltip / owned highlight all still work post-rewrite.
      **Tests: UI** (3 new tests: optional columns hidden by default, toggling shows/hides,
      always-visible columns excluded from the menu; existing tests hardened against the DOM
      staleness issue above). 26/26 web tests passing, verified in a clean Docker build too.

- [ ] **3.5 #19 — Persist preferences.** Wire `visibleColumns` (3.4) and `darkMode` (toggle-only
      since 2.3) into `UserPreferences` via the existing `useUserState()` — closes the
      dark-mode-persistence gap left open in 2.3.
      **Tests: Integration** (preference survives a reload).

### Multiple Lists & Filtering
- [ ] **3.6 #16 — Multiple lists.** List switcher UI + "start a new list" flow. Replaces 3.2's
      implicit single default list with real UI.
      **Tests: UI** (switching lists changes which `ownedIds` the table reads/writes)
      **+ Integration**.

- [ ] **3.7 #14 — Custom filtering.** 3-toggle UI for `ListFilter`
      (`finalStageOnly`/`regionalFormsOnly`/`hideGenderVariants`), applied on top of 3.3's tier
      predicate.
      **Tests: Unit** (filter-combination logic) **+ UI**.

### Polish (web)
- [ ] **3.8 Polish pass** — `#21` progress indicator (% owned), `#22` sticky headers, `#17`
      box/slot column, `#13` intro/welcome page. Sequenced and detailed individually once the
      table/lists/filtering core (3.2–3.7) is solid.

### Data & Mobile
- [ ] **3.9 #15 — Export/import.**
- [ ] **3.10 #12 — Mobile layout.** Port the web table + filters to React Native, reusing the same
      `useDataset`-equivalent + tier-predicate + `useUserState()` plumbing proven on web.
      Mobile equivalents of 3.3b's polish to carry over (web-only bits like `cursor-pointer` and
      the hover tooltip obviously don't apply):
      - Tap anywhere on a row/card toggles owned (same idea as "click anywhere in the row" on web).
      - Owned rows/cards get a visual highlight, matching web's approach.
      - Types as colored badges, not plain text — reuse the same type-color mapping idea
      (`apps/web/src/lib/pokemonTypeColors.ts`) rather than reinventing it.
      - No hover on touch, so no hover-tooltip equivalent — instead, consider a user-facing
      **sprite size setting** (mobile's own sprites are fine as-is by default, but a size option
      gives a similar "see it bigger" affordance without needing hover).
      - Verify `crypto.randomUUID()` (used by `useActiveList`'s list-creation logic on web) is
      actually available in this project's Hermes/RN setup before assuming the hook ports as-is —
      flagged as an open question in an earlier conversation, never actually checked.
- [ ] **3.11 #23 — Mobile portrait/landscape.**

### Tests
- [ ] **3.12 #25/#26 — Integration/UI test sweep.** Cross-cutting pass once the above is done.
      `#24` (unit tests) is already a standing rule applied throughout every task above, not a
      separate step.

---

## Ideas / Future (optional, not scheduled)

- **Publish `@cmodernel/living-dex-tiers` to npm.** Currently a `file:` dependency on the sibling
  `living-dex-organizer` repo, which required checking that repo out as a second step in CI (see
  `.github/workflows/deploy-web.yml`) since GitHub Actions only checks out one repo by default.
  Publishing it as a real npm package would remove that CI coupling and the cross-repo dependency
  entirely. Not urgent — the current setup works — but worth doing whenever it's convenient
  (e.g., next time that package needs a real version bump anyway).

- **Dataset bundling, offline caching, and version-check strategy.** Design discussion captured in
  `docs/DATA-VERSIONING.md` — bundling the dataset per app build + a lightweight version check
  (avoid re-fetching unchanged data, work offline from first launch), plus the data-integrity rule
  that makes it safe (append-only, stable slot ordering) and why the sync layer (once Supabase
  exists) is where the real version-mismatch handling belongs, not everyday local usage. Relevant
  once dataset caching (mobile especially) or Supabase sync gets scheduled.

- **Selectable theme system.** User leans toward a dark theme mixing black + purple, and a light
  theme of white + grays, but wants to decide the exact palette later — and beyond just picking
  one palette, wants the *user* to be able to choose between a set of themes (not just light/dark).
  Reshapes 2.3's fixed token set into something more like a registry of token sets +
  a settings-page picker. Web and mobile already share the token-mirroring approach from 2.3
  (`index.css` `@theme` / `theme.ts`), so a multi-theme registry should extend that same pattern
  on both platforms rather than diverging.

- **Left sidebar nav (collapsible) + Home as a user profile screen.** Web-specific idea for later:
  a left sidebar (list switcher, add list, settings, home) replacing 2.1's top nav bar, collapsing
  when the viewport narrows. Home would become a profile-style screen listing the user's lists
  (similar to a GitHub profile's repo list) rather than the table itself. Note: **mobile already
  has a version of this** — 2.2's bottom tabs (Home / Lists / Settings) are conceptually the same
  navigation split this is proposing for web, just a different widget (tabs vs. sidebar). Worth
  keeping the *information architecture* consistent between platforms even though the widget
  differs — e.g., mobile's existing "Lists" tab is the natural home for list create/delete (see
  next item), matching whatever the web sidebar ends up doing.

- **Create/delete lists (user-facing).** Already tracked as 3.6 (`#16`, multiple lists) — noted
  here only because the sidebar/profile idea above adds more concrete vision for what that task's
  UI looks like on web. No new tracking needed, just context for whoever picks up 3.6.

- **Social features.** Explicitly "way at the end" per the user — not to be considered until
  everything above is in a good place. No design thinking done on this yet, intentionally.

---

## How we work

- **Phase 1 & 2** are blockers — everything else depends on them. Do them fully before Phase 3.
- **Phase 3** items are loosely ordered by dependency (earlier items don't need later ones), but
  can be done in parallel or reordered if a feature becomes urgent.
- Every item in Phase 3 gets tests (unit or integration) — standing rule.
- Claude has standing permission to commit directly once a task is verified — no need to ask each
  time (see `docs/RULES.md` #8). Push still requires explicit confirmation.
