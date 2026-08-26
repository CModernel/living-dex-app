# Dataset versioning & offline strategy

> Design notes, not a build spec. Captures the reasoning from a design discussion with the user
> (2026-08-26) so it isn't lost before the relevant Phase 3/4 work starts. Nothing here is
> implemented yet — see `TODO.md` for what's actually scheduled.

## The problem

`fetchDataset()` (`packages/business-logic/src/data.ts`) currently fetches the full dataset from
jsDelivr on every cold app start, with only an in-memory cache (reset on every restart). No local
persistence, no bundling, no offline fallback.

Two separate concerns came out of thinking this through:

1. **Performance/offline UX** — mobile users shouldn't need network on every launch just to see
   the table; a fresh install should work immediately.
2. **Data integrity** — a user's `PokemonList.ownedIds` are *references* (slugs) into an external,
   mutable dataset. If the dataset changes in a way that invalidates those references, saved lists
   can break — silently in the worst case.

Problem 2 is the harder one, and it doesn't go away just because of an online/offline choice — see
[Why not purely online?](#why-not-purely-online) below.

## Core principle: append-only, stable ordering

The dataset must be safe to update **incrementally** without a coordinated app release, for the
common case (new Pokémon/generations added, obtainability curation tweaks). This requires a
discipline on the `living-dex-organizer` side:

- **Never delete an entry a user could already reference.** If a Pokémon becomes unobtainable
  (e.g., a curation change removes it from a tier), don't remove it from the dataset's `pokemon`
  dict — change its tier-membership/obtainability status, but keep the entry resolvable (name,
  sprite, etc.) so an existing `ownedId` referencing it never becomes a dangling reference.
- **Never renumber an already-assigned `sortIndex`/slot.** New entries append at the end. This is
  the one invariant that, if broken, would actually corrupt a user's mental model of "slot 47" —
  everything else (tier membership, obtainability) can change without touching stored `ownedIds`.
- Ideally, `living-dex-organizer` enforces this mechanically (a CI check comparing a new dataset
  build against the previous one: no published slug's `sortIndex` may change, no published slug
  may disappear from the raw `pokemon` dict) rather than relying on convention.

Under this discipline, **most realistic dataset changes are non-breaking by construction**:
adding Pokémon, or changing what counts toward a tier's completion, doesn't require any
client-side migration — the completion % calculation just needs to always evaluate against the
*current* tier predicate, not a stale bundled copy, for the number to be accurate. `ownedIds`
themselves never need to change.

A genuinely breaking schema change (if it ever happens) should get a new versioned path
(`data/v2/...`), the same way `data/v1/...` already works — old app builds keep requesting `v1`
and keep working against that shape; new builds request `v2`. `PokemonList.dataVersion` (already
in `types.ts`, currently set but never read) is the anchor for this at the per-list level, for
whenever this actually becomes relevant.

## Proposed architecture: bundle + lightweight version check

To get instant, offline-capable startup without giving up freshness:

1. Publish a small `version.json` (or a hash/timestamp) alongside the full dataset, updated by the
   same job that regenerates the dataset.
2. **Bundle a snapshot of the dataset into each app build** (mobile especially — a fresh install
   should work with zero network dependency). Web benefits less from bundling (every deploy is
   already fresh) but should still persist a local copy for the same offline/performance reasons.
3. On startup: read the local (bundled or previously-cached) dataset + its version marker → fetch
   only the small `version.json` → if it matches, skip the full fetch entirely; if it differs,
   fetch the full dataset and persist it (+ its version) locally for next launch.
4. If the version check itself fails (offline), just use whatever's local — no error, no forced
   update prompt. This also solves the "no fallback when offline" gap in the current
   implementation.

This reuses the `StorageAdapter` pattern already built for `UserState` (`storage.ts`) — same idea,
applied to the dataset instead of user state.

**Important:** this version check should be *opportunistic and silent*, not a gate that blocks
normal app usage. Given the append-only discipline above, there's no correctness reason to force
an update just to view the table or mark something owned locally. Blocking usage on a version
mismatch would be forced-update friction with no real safety benefit for the common case.

## Where version checks actually need to be strict: sync

The one place a stale local copy is a real risk is **syncing a list to a shared backend**
(Supabase, planned but not yet implemented — see `TODO.md`). That's the only point where a client
with outdated understanding of the dataset could write something inconsistent into a store other
devices/the server also read from.

Proposed flow once sync exists (simplified from an earlier, stricter draft — see rationale below):

| State | Local/offline use | Sync action |
|---|---|---|
| Not logged in | Always works, no version gate | Requires login first |
| Logged in, offline | Always works (local draft) | Queued/blocked until online |
| Logged in, online | Always works; version check happens silently in the background | Server validates the list against the *current* dataset at sync time; only a case that fails the append-only invariants (rare — would mean a real `v2`-style break) needs an actual migration step |

This is deliberately simpler than a first draft that gated normal usage on always having the
latest app/dataset version — with the append-only discipline in place, that strictness isn't
buying real safety, just friction for offline/anonymous users.

## Why not purely online?

Considered and rejected as the default architecture (not ruled out for the sync layer itself,
which *is* server-arbitrated).

A "no local copy ever, always ask the server" design would remove the "is my local copy stale"
question entirely — but it does **not** remove the underlying data-integrity problem (a list
referencing a Pokémon that changed status). It just relocates the resolution logic to the server
instead of distributing it across every shipped app version. That's a real advantage — a backend
can be fixed the moment a bug is found, an already-installed app version can't — but it comes at
the cost of losing offline capability entirely, which is a genuine feature for a Pokémon-tracking
app (someone checking off entries with no signal), not just an implementation accident.

**Conclusion:** hybrid, not purely online. Local-first for anonymous/offline use (safe by
construction, thanks to the append-only discipline), server-arbitrated only at the sync boundary
(where centralizing the resolution logic actually earns its complexity).

## Open items for whenever this gets scheduled

- Exact shape of `version.json` / how `living-dex-organizer`'s regen workflow publishes it.
- Where the mobile build pulls its bundled snapshot from at build time (a pre-build sync script
  copying the latest dataset into `apps/mobile/assets/`, most likely).
- UI decision: how (or whether) to surface "owned but no longer in this tier" entries, once #21
  (progress indicator) is built — silently exclude from the %, or show a small separate note.
- The CI-enforced append-only check on the `living-dex-organizer` side is a `living-dex-organizer`
  change, not a `living-dex-app` one — flag it there when this becomes active work.
