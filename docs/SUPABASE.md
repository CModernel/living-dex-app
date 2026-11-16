# Cloud sync setup (Supabase)

Cloud sync is optional (TODO 3.40/3.41). Without these settings the app builds and works exactly as before: everything stays
on the device and the Settings page shows no cloud section.

Living Dex uses a **Supabase project of its own** (decision 3.72): its own users, sessions, JWT secret and keys, never shared
with other apps such as leetcode-tracker-board. Its tables live in the schema `living_dex` (nothing in `public`), which can be
dumped on its own. See [PORTABILITY.md](PORTABILITY.md) for the move to self-hosting and [EDITIONS.md](EDITIONS.md) for the
community (local-only) build.

## 1. Project and database
1. Create a new Supabase project just for Living Dex (do not reuse another app's project).
2. SQL editor → run the migrations in order:
   [`20261113000000_living_dex_init.sql`](../supabase/migrations/20261113000000_living_dex_init.sql) (v1 table),
   [`20261116000000_living_dex_lists.sql`](../supabase/migrations/20261116000000_living_dex_lists.sql) (per-list rows for
   automatic sync, 3.42),
   [`20261116000100_living_dex_delete_me.sql`](../supabase/migrations/20261116000100_living_dex_delete_me.sql) (account
   deletion, 3.44).
3. Project Settings → **Data API** → **Exposed schemas**: add `living_dex` (keep `public`).

## 2. Sign-in
Authentication → **Sign In / Providers**:
- **Email**: enabled, magic link (no password needed).
- **Google**: create an OAuth client (Google Cloud Console → APIs & Services → Credentials → Web application) with the
  authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` and authorized JavaScript origin
  `https://cmodernel.github.io`; paste its client id and secret into the Google provider.

Authentication → **URL Configuration** → **Redirect URLs**, add:
- `https://cmodernel.github.io/living-dex-app/settings`
- `http://localhost:5173/living-dex-app/settings`

Set the Site URL to `https://cmodernel.github.io/living-dex-app/`; Living Dex also passes its own redirect.

The free email sender has a low hourly limit; set up custom SMTP if many people sign in.

## 3. App configuration
Both values are public (the anon key only allows what the row level security policies allow).

- Local: `apps/web/.env.local`
  ```
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<anon / publishable key>
  ```
- Hosted edition only: both values are ignored when the build sets `VITE_EDITION=community`.
- Deploy: GitHub repo → Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (the deploy workflow passes them to the build).

## What syncs
Only collections (owned Pokémon, games, tiers, filters and per-list view settings). Columns, theme and the open list stay
per device. Since 3.42 sync is automatic while signed in: pull on start, on focus and when the network returns; push 2 s
after a change. One row per list (`living_dex.lists`); a deleted list leaves a tombstone (`deleted = true`). Each device
keeps its last synced copy and merges three ways against it, so un-marking and deleting propagate, while additions on two
devices at once are both kept; a list deleted on one device but edited on another since the last sync is kept. The first
sync of an account imports what v1 "Sync now" stored in `user_state`.

## Later
- Free projects pause after a week without activity; a small scheduled keepalive can be added if needed.
- Account deletion (3.44): Settings → Cloud sync → Delete account calls `living_dex.delete_me()`, which deletes the caller
  from `auth.users`; the foreign keys cascade to their rows. What is stored and why: [PRIVACY.md](PRIVACY.md).
