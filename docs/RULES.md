# Development Rules — Living Dex App

> This file defines mandatory rules for **any AI model/assistant** (Claude, or any other) working
> in this repository. It is not end-user documentation.
>
> See also [`TODO.md`](../TODO.md) for the phase-by-phase roadmap and implementation history —
> this repo doesn't have a separate `PLANNING.md`; `TODO.md` serves that role, kept continuously
> up to date rather than written once upfront.
>
> The sibling [`living-dex-organizer`](https://github.com/CModernel/living-dex-organizer) repo
> has its own `docs/RULES.md` governing that repo (the data pipeline). The rules below are
> specific to this repo (the web/mobile app); where the two overlap in spirit (security, testing,
> git discipline), they're restated here rather than assumed inherited, since an assistant working
> in this repo may not have that other repo's rules loaded.

## 1. Keep docs in sync with reality

- Whenever a change is significant enough that someone opening this repo fresh would need to know
  about it to work effectively — a new dependency constraint, a changed dev workflow, a stack
  change, a new gotcha worth avoiding twice — **update `README.md`** (root, and any affected
  `apps/*/README.md`) **in the same change**, not as a follow-up.
- This includes `apps/mobile/AGENTS.md`/`CLAUDE.md` when Expo SDK version or native-dependency
  constraints change — that file is what an AI assistant reads first when touching mobile code.
- `TODO.md` is the detailed *history* (what was built, in what order, bugs found and root-caused
  along the way) — keep adding to it as work happens. `README.md` is the *current-state summary*
  for someone getting oriented — keep it accurate to what's true *now*, not a changelog.
- Routine implementation details (a new component, a small refactor) don't need a README update.
  The bar is "would a developer or another assistant get confused, blocked, or repeat a
  already-solved mistake without this."
- Keep `README.md` files **short** — a few lines per point, not a deep-dive. Add important
  information (stack, gotchas, constraints), but link to `TODO.md` for the detailed history/why
  instead of inlining it. If a README section is growing into a wall of text, trim it.

## 2. Security and sensitive data

- **Never** hardcode credentials, API keys, passwords, OAuth secrets, tokens, or any other
  sensitive information.
- **Never** expose privileged credentials in frontend code (this is a client-only app right now —
  no backend to hold secrets on).
- Any implementation touching one of these areas — credentials, authentication/login, OAuth,
  sensitive user data, authorization/security rules, user data persistence/sync, backend access,
  database access, secrets/environment variables, Supabase — **must** leave an explicit TODO
  describing what still needs to be reviewed/implemented securely, per the format in `TODO.md`.
- Do not assume security-sensitive architecture decisions without documenting them explicitly and
  discussing them with the user first — this includes auth strategy, RLS policies, and conflict
  resolution for multi-device sync.

## 3. Static data vs. user state

- Static Pokémon/dataset data (`fetchDataset()` in `packages/business-logic`) is **application
  data**, not user data — never mutate it or duplicate parts of it into user state.
- User state (`UserState`/`PokemonList` in `packages/business-logic/src/types.ts` — which Pokémon
  is owned, list membership, preferences) is kept **separate** and persisted via the
  `StorageAdapter` pattern in `storage.ts` (platform-specific adapter injected by each app).
- The user can only modify their own collection state; never the static dataset.

## 4. Backend and storage

- Supabase (or any backend) is planned for future sync/multi-device support, but **must not be
  implemented until explicitly requested** — see `TODO.md` for when this becomes relevant.
- Keep the storage layer's `StorageAdapter` abstraction (`packages/business-logic/src/storage.ts`)
  as the seam a future backend would plug into — don't hardcode assumptions that couple the app to
  `localStorage`/`AsyncStorage` specifically outside that adapter.
- Do not introduce services, servers, databases, or dependencies before they're actually needed.

## 5. General architecture

- Prefer simple solutions; don't reach for a library's full API surface before the feature
  actually needs it (e.g., the main table uses a plain HTML `<table>` until column
  customization — 3.4 — actually needs TanStack Table's column-visibility API; see `TODO.md`'s 3.2
  notes).
- Keep business logic in `packages/business-logic`, independent of React/React Native — the two
  apps' `src/hooks`/`src/state` directories are the React-specific wrapping layer, not the logic
  itself.
- The monorepo's React version must stay pinned to one exact version everywhere (see root
  `README.md`) — this is a hard constraint from `react-native`'s bundled renderer, not a style
  preference; don't loosen it without re-verifying on a physical device.

## 6. Testing

- Every new implementation must include tests, per the type(s) declared in `TODO.md`'s Testing
  Convention (Unit / Integration / UI / E2E).
- Unit tests must cover the relevant business logic, including edge cases.
- UI-affecting changes get a manual verification pass too (browser screenshots for web, physical
  device for mobile) before being marked done in `TODO.md` — a passing test suite doesn't
  guarantee a working app (this repo has hit real bundle-succeeds-but-runtime-crashes bugs).
- A feature is not considered complete if its core business logic isn't tested.

## 7. TODO policy

- TODOs are mandatory for security decisions or future architecture decisions intentionally left
  pending (see rule 2).
- Each TODO must clearly explain **what's missing** and **why** it was left pending.
- Every item in `TODO.md` is numbered once when added and never renumbered, so it stays
  referenceable in conversation — feature IDs (`#20`, `#11`, etc., tracing back to
  `living-dex-organizer/TODO.md`'s numbering) never change even if a phase's task ordering is
  refined.

## 8. Version control (git)

- Claude has standing permission to run `git commit` directly in this repo, without asking for
  confirmation each time, once a task's changes are verified (tests pass, build works, manual
  check done where relevant). Don't wait to be asked.
- Commits must be authored as the user's own git identity (personal account) — **never** add an
  AI co-author trailer (`Co-Authored-By: Claude...` or similar).
- Always show the exact commit message text in chat, whether Claude or the user performs the
  commit.
- **Never** run `git push` (or destructive operations — `git reset --hard`, `git push --force`,
  etc.) without the user's explicit confirmation at that specific moment.
- If something related to the same task/TODO item is left unresolved, ask the user before
  committing — they may want it squashed into the same commit rather than split.

## 9. Language

- All project content — documentation, code, comments, commit messages, file and variable names —
  must be written in **English**, regardless of the language the conversation happens in.

## 10. General rule

When in doubt, prefer a simple, testable, modular implementation that keeps the door open for a
future backend/storage migration without implementing it prematurely — and update the docs
(rule 1) so the next person (human or AI) doesn't have to rediscover what you just learned.
