-- Editable company types — mirrors 0022_contact_roles. Company types used to be a
-- fixed Postgres enum (`company_type`), so admins could neither rename nor add them.
-- This replaces the enum with a small, editable, system-wide lookup table so the
-- Admin "Edit company types" card can rename/add types.
--
-- Design: `companies.type` stores a stable `slug`; the editable `label` is
-- display-only. Renaming changes only the label, so existing companies keep their
-- association. Custom types get a new slug + label. `is_any_agency_admin()` already
-- exists (0022).

create table public.company_types (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  label      text not null,
  sort_order int  not null default 0,
  is_system  boolean not null default false,  -- 'other' is the protected fallback
  created_at timestamptz not null default now()
);

alter table public.company_types enable row level security;

-- Any signed-in user can read the labels (company form + list filters need them).
create policy company_types_select on public.company_types
  for select to authenticated using (true);

-- Only agency admins can modify the shared list.
create policy company_types_admin_write on public.company_types
  for all to authenticated
  using (public.is_any_agency_admin())
  with check (public.is_any_agency_admin());

-- Move companies.type off the enum so custom slugs are storable. The cast keeps
-- every existing value (they are already the default slugs). Nothing else
-- references the enum type, so it can be dropped.
alter table public.companies alter column type drop default;
alter table public.companies alter column type type text using type::text;
alter table public.companies alter column type set default 'other';
drop type public.company_type;

-- Seed the five historical defaults. Idempotent so a re-run is safe.
insert into public.company_types (slug, label, sort_order, is_system) values
  ('operator', 'Operator', 1, false),
  ('landlord', 'Landlord', 2, false),
  ('agent',    'Agent',    3, false),
  ('vendor',   'Vendor',   4, false),
  ('other',    'Other',    5, true)
on conflict (slug) do nothing;

-- Global usage count for a company-type slug (definer: company_types is system-wide
-- but companies is RLS-scoped, so an admin can't otherwise see cross-agency usage).
create or replace function public.company_type_in_use(p_slug text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.companies where type = p_slug;
$$;
revoke execute on function public.company_type_in_use(text) from public, anon;
grant  execute on function public.company_type_in_use(text) to authenticated;
