-- Public intake triage queue.
--
-- Publicly-submitted requirements used to be written straight into
-- companies/contacts/requirements, so anonymous input went live as an active,
-- matchable brief and could be merged onto an existing company by a wildcard
-- name match. Submissions now land here as `pending` rows and only become CRM
-- records when an agent approves them from /intake.
--
-- Writes come from the public form via the service-role client, which bypasses
-- RLS — there is deliberately no `anon` insert policy, so the table cannot be
-- written to with the publishable key.

create table if not exists public.intake_submissions (
  id                     uuid primary key default gen_random_uuid(),
  agency_id              uuid not null references public.agencies(id) on delete cascade,
  status                 text not null default 'pending'
                           check (status in ('pending', 'approved', 'rejected')),

  -- Exactly what the public form collects (kept verbatim — never edited here).
  company_name           text not null,
  first_name             text not null,
  last_name              text,
  email                  text not null,
  phone                  text,
  property_type          text,
  -- Comma-joined picks from the UK locations combobox (free text allowed);
  -- split + classified into the requirement's town/county/region/district
  -- arrays at approval time.
  target_locations       text,
  min_sqft               integer,
  max_sqft               integer,
  min_covers             integer,
  max_covers             integer,
  max_rent               numeric,
  max_premium            numeric,
  notes                  text,

  -- Triage outcome.
  created_requirement_id uuid references public.requirements(id) on delete set null,
  reviewed_by            uuid references auth.users(id) on delete set null,
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists intake_submissions_agency_status_idx
  on public.intake_submissions(agency_id, status, created_at desc);
create index if not exists intake_submissions_requirement_idx
  on public.intake_submissions(created_requirement_id);

alter table public.intake_submissions enable row level security;

do $$ begin
  create policy intake_submissions_all on public.intake_submissions
    for all to authenticated
    using (agency_id in (select public.auth_agency_ids()))
    with check (agency_id in (select public.auth_agency_ids()));
exception when duplicate_object then null; end $$;
