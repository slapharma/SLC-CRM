-- Phase 5 — editable contact roles
-- Contact roles used to be a fixed Postgres enum (`contact_role`), so admins could
-- neither rename nor add them. This replaces the enum with a small, editable
-- lookup table so the Admin "Edit roles" card can rename/add roles. Scope is
-- system-wide (one shared list — this is effectively a single-tenant CDG CRM).
--
-- Design: `contacts.role` stores a stable `slug`; the editable `label` is
-- display-only. Renaming changes only the label, so existing contacts keep their
-- association. Custom roles get a new slug + label.

-- Admin predicate with no agency argument (the roles list is system-wide). Mirrors
-- is_agency_admin() from 0001_init.sql: definer + locked search_path so it can read
-- agency_members without tripping RLS.
create or replace function public.is_any_agency_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members
     where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke execute on function public.is_any_agency_admin() from public, anon;
grant  execute on function public.is_any_agency_admin() to authenticated;

create table public.contact_roles (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  label      text not null,
  sort_order int  not null default 0,
  is_system  boolean not null default false,  -- 'other' is the protected fallback
  created_at timestamptz not null default now()
);

alter table public.contact_roles enable row level security;

-- Any signed-in user can read the labels (contact form + list filters need them).
create policy contact_roles_select on public.contact_roles
  for select to authenticated using (true);

-- Only agency admins can modify the shared list.
create policy contact_roles_admin_write on public.contact_roles
  for all to authenticated
  using (public.is_any_agency_admin())
  with check (public.is_any_agency_admin());

-- Move contacts.role off the enum so custom slugs are storable. The cast keeps
-- every existing value (they are already the default slugs), and 'other' stays
-- the default. Nothing else references the enum type, so it can be dropped.
alter table public.contacts alter column role drop default;
alter table public.contacts alter column role type text using role::text;
alter table public.contacts alter column role set default 'other';
drop type public.contact_role;

-- Seed the six historical defaults. Idempotent so a re-run is safe.
insert into public.contact_roles (slug, label, sort_order, is_system) values
  ('acquisitions', 'Acquisitions', 1, false),
  ('landlord',     'Landlord',     2, false),
  ('solicitor',    'Solicitor',    3, false),
  ('agent',        'Agent',        4, false),
  ('finance',      'Finance',      5, false),
  ('other',        'Other',        6, true)
on conflict (slug) do nothing;
