-- Living Dex account deletion (TODO 3.44). A signed-in user deletes their own account; the `on delete cascade` foreign
-- keys remove their `lists` and `user_state` rows with it. `security definer` because `authenticated` cannot touch
-- `auth.users`; it only ever deletes the caller (auth.uid()), and an empty search_path keeps names fully qualified.
-- Plain PostgreSQL, so it ports to self-hosted Supabase as is (docs/PORTABILITY.md). Run after the earlier migrations.

create or replace function living_dex.delete_me()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function living_dex.delete_me() from public, anon;
grant execute on function living_dex.delete_me() to authenticated;
