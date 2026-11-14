# Cloud sync setup (Supabase)

Cloud sync is optional (TODO 3.40/3.41). Without these settings the app builds and works exactly as before: everything stays
on the device and the Settings page shows no cloud section.

Living Dex uses a **Supabase project of its own** (decision 3.72): its own users, sessions, JWT secret and keys, never shared
with other apps such as leetcode-tracker-board. Its tables live in the schema `living_dex` (nothing in `public`), which can be
dumped on its own. See [PORTABILITY.md](PORTABILITY.md) for the move to self-hosting and [EDITIONS.md](EDITIONS.md) for the
community (local-only) build.

## 1. Project and database
1. Create a new Supabase project just for Living Dex (do not reuse another app's project).
2. SQL editor → run [`supabase/migrations/20261113000000_living_dex_init.sql`](../supabase/migrations/20261113000000_living_dex_init.sql).
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
per device. "Sync now" merges: owned Pokémon are combined, lists missing on either side are added, nothing owned is ever
removed. Until automatic sync (TODO 3.42), un-marking a Pokémon or deleting a list on one device comes back after syncing
with a device that still has it.

## Later
- Free projects pause after a week without activity; a small scheduled keepalive can be added if needed.
- Account deletion and a privacy note: TODO 3.44.
