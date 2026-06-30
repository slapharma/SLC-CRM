-- Upgrades batch — Phase 0
-- (#2)  disposal_documents — uploaded PDFs (floor plans, vendor docs) per listing.
-- (#10) disposal_areas     — the available-area schedule (per-floor / per-unit rows).
-- Both reuse the standard per-agency tenant-isolation RLS (0001 pattern).

-- ─────────────────────────────────────────────────────────────────────────────
-- Documents
-- ─────────────────────────────────────────────────────────────────────────────
create table public.disposal_documents (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  disposal_id uuid not null references public.disposals(id) on delete cascade,
  name        text not null,
  doc_type    text not null default 'other'
                check (doc_type in ('floor_plan','vendor','brochure','epc','other')),
  file_path   text not null,          -- path within the 'disposal-docs' bucket
  size_bytes  bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index disposal_documents_agency_idx   on public.disposal_documents(agency_id);
create index disposal_documents_disposal_idx on public.disposal_documents(disposal_id);

alter table public.disposal_documents enable row level security;
create policy disposal_documents_all on public.disposal_documents
  for all to authenticated
  using (agency_id in (select public.auth_agency_ids()))
  with check (agency_id in (select public.auth_agency_ids()));

-- Private bucket (vendor docs can be sensitive). Reads go through signed URLs
-- generated server-side with the caller's JWT, so a SELECT policy is required.
insert into storage.buckets (id, name, public)
  values ('disposal-docs', 'disposal-docs', false)
  on conflict (id) do nothing;

do $$ begin
  create policy "disposal-docs auth select" on storage.objects
    for select to authenticated using (bucket_id = 'disposal-docs');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "disposal-docs auth insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'disposal-docs');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "disposal-docs auth delete" on storage.objects
    for delete to authenticated using (bucket_id = 'disposal-docs');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Available-area schedule
-- ─────────────────────────────────────────────────────────────────────────────
create table public.disposal_areas (
  id           uuid primary key default gen_random_uuid(),
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  disposal_id  uuid not null references public.disposals(id) on delete cascade,
  name         text not null,          -- e.g. "Ground floor", "Basement", "Unit 2"
  size_sqft    numeric,
  size_sqm     numeric,
  rent_pa      numeric,
  availability text,                   -- e.g. "Available", "Under offer", "Let"
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index disposal_areas_disposal_idx on public.disposal_areas(disposal_id);
create index disposal_areas_agency_idx   on public.disposal_areas(agency_id);

alter table public.disposal_areas enable row level security;
create policy disposal_areas_all on public.disposal_areas
  for all to authenticated
  using (agency_id in (select public.auth_agency_ids()))
  with check (agency_id in (select public.auth_agency_ids()));
