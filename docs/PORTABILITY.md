# Backend portability (TODO 3.72)

Goal: start on Supabase Cloud, keep the option to move to a Linux VPS with Docker without redesigning the app. Rules that
follow from it: standard PostgreSQL, versioned migrations, one independent backend project per app (own users, JWT secret and
keys; nothing shared with other apps), no secrets in the client, provider specifics in one place.

## Where Supabase touches the code
Only `apps/web/src/lib/cloud.ts` (plus `state/CloudSyncContext.tsx` and `CloudSection`, which call it). Nothing in `business-logic` knows
about Supabase; the merge (`sync.ts`) and the export envelope are plain TypeScript.

| Supabase feature | Used for | Self-hosted equivalent |
| --- | --- | --- |
| Postgres + `living_dex` schema | `lists` (per-list rows + tombstones, 3.42) and v1 `user_state` tables, `touch_updated_at` trigger | Any PostgreSQL; migration `supabase/migrations/*.sql` |
| Row level security | each user reads/writes only their row | Same policies in the migration (SQL, portable) |
| Auth (magic link, Google) | sign-in | Self-hosted Supabase (GoTrue) or another OIDC/email provider; users are NOT portable by a plain dump (confirm the supported method, test it) |
| Data API (PostgREST) schema exposure | `client.schema('living_dex')` | Same setting in the self-hosted stack |
| Storage, Edge Functions, Realtime, RPC | **not used** (Realtime would come with 3.43) | n/a; document before adding |

Before adding a Supabase-specific feature, add a row here with its self-hosted equivalent.

## Backups
- Data: `pg_dump --schema=living_dex` (Supabase dashboard → Database → Backups on paid plans). Keep copies off the server.
- Users also keep their own backup: Settings → export (the versioned envelope). It is the portable format of the user data.
- Test a restore into a scratch database now and then; an untested backup is not a backup.

## Moving to a VPS (outline, per app)
1. Provision and secure the VPS, install Docker, deploy the matching self-hosted Supabase stack.
2. Recreate secrets, domain, TLS, SMTP, OAuth redirect URLs (see docs/SUPABASE.md for the list).
3. Restore the schema, re-apply RLS and exposed schemas, migrate users with a verified method.
4. Point `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at the new stack, test sign-in, sync, sign-out, then cut over.
5. Keep the old project and a verified backup until the new one is stable.

## Keys and rotation
The anon key is public by design (RLS is the protection). Never ship a service-role key in the client. To rotate: create the
new key in the project, update the GitHub Actions Variables, redeploy.

## Free-tier notes
Free Supabase projects pause after a week of inactivity; check current limits and region before relying on them.
