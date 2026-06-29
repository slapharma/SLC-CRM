-- Phase 2 — agent ownership on records
-- Adds a single "lead agent" owner (internal user) to companies, contacts and
-- disposals, plus many-to-many "additional agents" join tables for collaborators.
-- All FKs target auth.users; join tables carry agency_id so they reuse the exact
-- same tenant-isolation RLS as the rest of the domain (0001 pattern).

-- ─────────────────────────────────────────────────────────────────────────────
-- Lead agent (single owner per record; nullable, cleared if the user is removed)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.companies add column lead_agent_id uuid references auth.users(id) on delete set null;
alter table public.contacts  add column lead_agent_id uuid references auth.users(id) on delete set null;
alter table public.disposals add column lead_agent_id uuid references auth.users(id) on delete set null;

-- Index the new FKs (advisor: unindexed_foreign_keys).
create index companies_lead_agent_idx on public.companies(lead_agent_id);
create index contacts_lead_agent_idx  on public.contacts(lead_agent_id);
create index disposals_lead_agent_idx on public.disposals(lead_agent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Additional agents (collaborators) — many-to-many between records and users
-- ─────────────────────────────────────────────────────────────────────────────
create table public.company_agents (
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_agents_agency_idx on public.company_agents(agency_id);
create index company_agents_user_idx   on public.company_agents(user_id);

create table public.contact_agents (
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, user_id)
);
create index contact_agents_agency_idx on public.contact_agents(agency_id);
create index contact_agents_user_idx   on public.contact_agents(user_id);

create table public.disposal_agents (
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  disposal_id uuid not null references public.disposals(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (disposal_id, user_id)
);
create index disposal_agents_agency_idx on public.disposal_agents(agency_id);
create index disposal_agents_user_idx   on public.disposal_agents(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security — same tenant-isolation contract as the domain tables.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.company_agents  enable row level security;
alter table public.contact_agents  enable row level security;
alter table public.disposal_agents enable row level security;

create policy company_agents_all on public.company_agents
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy contact_agents_all on public.contact_agents
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy disposal_agents_all on public.disposal_agents
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
