-- Phase 2 — profiles
-- The browser/auth client cannot read auth.users, so we mirror the safe display
-- fields (email, full_name) into public.profiles. This lets the UI resolve the
-- lead_agent_id / *_agents user ids (added in 0007) into human-readable names.
--
-- profiles is readable (RLS) by anyone who shares an agency with the row's user,
-- and is written only by the SECURITY DEFINER sync trigger — never by clients.

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A member can read the profile of anyone in one of their agencies.
-- auth_agency_ids() is SECURITY DEFINER, so this does not recurse on RLS.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id in (
      select user_id from public.agency_members
      where agency_id in (select public.auth_agency_ids())
    )
  );

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Keep profiles in sync with auth.users (insert + relevant updates).
create or replace function public.sync_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
    )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$;

-- Internal only — called by the trigger as owner; not exposed via PostgREST RPC.
revoke execute on function public.sync_profile() from public, anon, authenticated;

create trigger on_auth_user_profile
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_profile();

-- Backfill existing users (e.g. the demo agents seeded directly into auth.users).
insert into public.profiles (id, email, full_name)
  select id, email,
         coalesce(nullif(raw_user_meta_data->>'full_name', ''), split_part(email, '@', 1))
    from auth.users
  on conflict (id) do nothing;
