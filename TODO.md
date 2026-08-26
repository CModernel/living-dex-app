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
      repo root into an unrelated ancestor directory's react copy) — resolved by hoisting a shared
      react/react-dom copy to the workspace root
      **Tests: UI** (HomePage/ListsPage/SettingsPage/Layout render assertions) **+ Integration**
      (`AppRoutes.test.tsx` verifies `/`, `/lists`, `/settings` each render the correct page via
      `MemoryRouter`). 8/8 tests passing.

- [ ] **2.2 Mobile app routing ready.**
      - Expo Router already scaffolded; verify tab-based or stack-based routing is clear
      - Root layout (Expo's `_layout.tsx`)
      - Placeholder screens for the same flows as web (main table, lists, settings)
      - Can navigate between them without errors

- [ ] **2.3 Theme/styling foundation (both platforms).**
      - **Web:** Tailwind color tokens finalized (`dark:` variants working). Verify light/dark mode
        toggle exists (will be wired to #19 later).
      - **Mobile:** React Native theme context (colors, spacing, typography). Pairs with Tailwind
        for web consistency.

- [ ] **2.4 Storage wiring in business-logic.**
      - `packages/business-logic/src/storage.ts` — already has `getUserState()` / `setUserState()`
        (localStorage).
      - Add hooks/React context wrapper so web/mobile can call `useUserState()` and get
        `[state, setState]`. (React-specific; not in business-logic, but in each app's context.)
      - Verify persists to localStorage (web) / AsyncStorage (mobile) correctly.

- [ ] **2.5 Tier-logic import verified (both platforms).**
      - Both `apps/web` and `apps/mobile` can `import { TIERS } from '@cmodernel/living-dex-tiers'`
        without errors.
      - Tests in both apps exercise the import (e.g., `TIERS['living-form'].count > 0`).

- [ ] **2.6 Unit test setup verified (both platforms).**
      - **Web:** Vitest + Testing Library (already configured; #1.3 verifies).
      - **Mobile:** Vitest or Jest via Expo (configure if needed). At least one test passes.

**Phase 2 complete when:** Both apps compile, routing works, storage layer ready, no feature code yet.

---

## Phase 3: Features (Building the app)

After Phase 2, implement the actual feature list. Organized by dependency order:

### Foundation
- **3.1 #29 — Dataset fetching** (done in Phase 1.2, but add UI integration: web table can fetch & render)
- **3.2 #30 — Tier predicates** (done in Phase 1.5 import, but add UI: filter dropdown showing tier names)

### Core Table (Web)
- **3.3 #20 — Main spreadsheet table** (name, types, owned checkbox; no customization yet)
- **3.4 #11 — Customizable columns** (hide/show via TanStack Table column visibility)
- **3.5 #19 — Persist preferences** (selected columns saved to localStorage)

### Multiple Lists & Filtering
- **3.6 #16 — Multiple lists** (list switcher, "start a list" flow)
- **3.7 #14 — Custom filtering** (3-toggle UI for `ListFilter`)

### Polish (web)
- **3.8 #21 — Progress indicator** (% owned)
- **3.9 #22 — Sticky headers**
- **3.10 #17 — Box/slot column**
- **3.11 #10 — Dark mode** (toggle + persist in #19)
- **3.12 #13 — Intro/welcome page**

### Data & Mobile
- **3.13 #15 — Export/import**
- **3.14 #12 — Mobile layout** (port web table + filters to React Native)
- **3.15 #23 — Mobile portrait/landscape**

### Tests
- **3.16 #25 — Integration tests**
- **3.17 #26 — UI tests**

(#24 unit tests applied throughout, per `docs/RULES.md` #5)

---

## How we work

- **Phase 1 & 2** are blockers — everything else depends on them. Do them fully before Phase 3.
- **Phase 3** items are loosely ordered by dependency (earlier items don't need later ones), but
  can be done in parallel or reordered if a feature becomes urgent.
- Every item in Phase 3 gets tests (unit or integration) — standing rule.
- No commits without confirmation (per `living-dex-organizer/docs/RULES.md` #7).
