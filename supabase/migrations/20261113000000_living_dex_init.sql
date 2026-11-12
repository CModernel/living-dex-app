-- Living Dex cloud sync (TODO 3.40). One row per user holding the export envelope of their collections.
-- Lives in its own schema so it stays isolated inside the Supabase project shared with other apps, and can be moved to a
-- dedicated project later by dumping just this schema. Run once in the SQL editor (or `supabase db push`).

create schema if not exists living_dex;

create table if not exists living_dex.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- The app's export envelope ({ app, version, exportedAt, state: { lists } }); validated by the app on read.
  data       jsonb not null,
  version    integer not null,
  updated_at timestamptz not null default now(),
  constraint user_state_size check (pg_column_size(data) < 2000000)
);

create or replace function living_dex.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_state_touch on living_dex.user_state;
create trigger user_state_touch
  before update on living_dex.user_state
  for each row execute function living_dex.touch_updated_at();

-- Row level security: a signed-in user can only see and change their own row. Nothing for anonymous visitors.
alter table living_dex.user_state enable row level security;

drop policy if exists "read own" on living_dex.user_state;
drop policy if exists "insert own" on living_dex.user_state;
drop policy if exists "update own" on living_dex.user_state;
drop policy if exists "delete own" on living_dex.user_state;
create policy "read own"   on living_dex.user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on living_dex.user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on living_dex.user_state for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on living_dex.user_state for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema living_dex to authenticated;
grant select, insert, update, delete on living_dex.user_state to authenticated;
revoke all on living_dex.user_state from anon;
