-- Phase 4 — per-agency settings
-- Stores the agency's OpenRouter API key + model for the AI "Deep Dive" feature
-- (entered in the Admin page) and a jsonb bag for future integration tokens. The
-- key is a secret, so only agency admins can read/write the row directly. A
-- SECURITY DEFINER helper lets any member fetch the config server-side to run a
-- Deep Dive, without exposing the table to non-admins.

create table public.agency_settings (
  agency_id          uuid primary key references public.agencies(id) on delete cascade,
  openrouter_api_key text,
  openrouter_model   text not null default 'perplexity/sonar',
  integrations       jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);

alter table public.agency_settings enable row level security;

-- Only agency admins can read/write settings (the key is a shared secret).
create policy agency_settings_admin_all on public.agency_settings
  for all to authenticated
  using (public.is_agency_admin(agency_id))
  with check (public.is_agency_admin(agency_id));

create trigger trg_agency_settings_updated before update on public.agency_settings
  for each row execute function public.set_updated_at();

-- Any agency member can fetch their agency's OpenRouter config server-side (to
-- run a Deep Dive). Definer so non-admins don't need direct table select.
create or replace function public.current_agency_openrouter()
returns table(api_key text, model text)
language plpgsql security definer set search_path = '' as $$
declare
  aid uuid;
begin
  select agency_id into aid from public.agency_members where user_id = auth.uid() limit 1;
  if aid is null then return; end if;
  return query
    select s.openrouter_api_key, s.openrouter_model
      from public.agency_settings s
     where s.agency_id = aid;
end;
$$;

revoke execute on function public.current_agency_openrouter() from public, anon;
grant  execute on function public.current_agency_openrouter() to authenticated;
