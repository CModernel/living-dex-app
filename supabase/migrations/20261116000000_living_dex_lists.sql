-- Living Dex automatic sync (TODO 3.42): one row per list, so devices merge list by list and a deleted list leaves a
-- tombstone (deleted = true) instead of coming back. Run after 20261113000000_living_dex_init.sql. The v1 table
-- `user_state` is kept: the app reads it once to import collections synced before this migration, never writes it again.

create table if not exists living_dex.lists (
  user_id    uuid not null references auth.users (id) on delete cascade,
  list_id    text not null,
  -- The app's export envelope holding this one list ({ app, version, exportedAt, state: { lists: [list] } }), validated by
  -- the app on read; '{}' for a deleted list.
  data       jsonb not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, list_id),
  constraint lists_size check (pg_column_size(data) < 1000000),
  constraint lists_id_length check (char_length(list_id) between 1 and 100)
);

drop trigger if exists lists_touch on living_dex.lists;
create trigger lists_touch
  before update on living_dex.lists
  for each row execute function living_dex.touch_updated_at();

alter table living_dex.lists enable row level security;

drop policy if exists "read own" on living_dex.lists;
drop policy if exists "insert own" on living_dex.lists;
drop policy if exists "update own" on living_dex.lists;
drop policy if exists "delete own" on living_dex.lists;
create policy "read own"   on living_dex.lists for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own" on living_dex.lists for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own" on living_dex.lists for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own" on living_dex.lists for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on living_dex.lists to authenticated;
revoke all on living_dex.lists from anon;
