# Cloud sync setup (Supabase)

Cloud sync is optional (TODO 3.40/3.41). Without these settings the app builds and works exactly as before: everything stays
on the device and the Settings page shows no cloud section.

Living Dex uses its own schema, `living_dex`, inside a Supabase project that can be shared with other apps (e.g.
leetcode-tracker-board). Nothing it creates is in `public`, so the two apps don't collide, and Living Dex can later move to
its own project by dumping only that schema.

## 1. Project and database
1. Create a Supabase project (or reuse the shared one).
2. SQL editor → run [`supabase/migrations/20261113000000_living_dex_init.sql`](../supabase/migrations/20261113000000_living_dex_init.sql).
3. Project Settings → **Data API** → **Exposed schemas**: add `living_dex` (keep `public`).

## 2. Sign-in
Authentication → **Sign In / Providers**:
- **Email**: enabled, magic link (no password needed). Note: provider settings are project-wide, so this also enables email
  for any other app on the project; an app that doesn't offer it in its UI is unaffected.
- **Google**: create an OAuth client (Google Cloud Console → APIs & Services → Credentials → Web application) with the
  authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` and authorized JavaScript origin
  `https://cmodernel.github.io`; paste its client id and secret into the Google provider.

Authentication → **URL Configuration** → **Redirect URLs**, add:
- `https://cmodernel.github.io/living-dex-app/settings`
- `http://localhost:5173/living-dex-app/settings`

The Site URL can stay pointed at another app: Living Dex always passes its own redirect.

The free email sender has a low hourly limit; set up custom SMTP if many people sign in.

## 3. App configuration
Both values are public (the anon key only allows what the row level security policies allow).

- Local: `apps/web/.env.local`
  ```
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<anon / publishable key>
  ```
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
