-- Upgrades batch — #9b
-- Enquiries (requirements) gain the same agent-ownership model as companies /
-- contacts / disposals (0007): a single lead agent + many additional agents.

alter table public.requirements
  add column if not exists lead_agent_id uuid references auth.users(id) on delete set null;
create index if not exists requirements_lead_agent_idx on public.requirements(lead_agent_id);

create table if not exists public.requirement_agents (
  agency_id      uuid not null references public.agencies(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (requirement_id, user_id)
);
create index if not exists requirement_agents_agency_idx on public.requirement_agents(agency_id);
create index if not exists requirement_agents_user_idx   on public.requirement_agents(user_id);

alter table public.requirement_agents enable row level security;
create policy requirement_agents_all on public.requirement_agents
  for all to authenticated
  using (agency_id in (select public.auth_agency_ids()))
  with check (agency_id in (select public.auth_agency_ids()));
