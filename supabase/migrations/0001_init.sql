-- SLC-CRM Phase 1 — data layer
-- Multi-tenant (per-agency) schema for the UK leisure & licensed property sector,
-- with Row-Level Security isolating every row by agency membership.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums (categorical domain values; mirror src/lib/badges.ts)
-- ─────────────────────────────────────────────────────────────────────────────
create type public.member_role        as enum ('admin', 'agent');
create type public.company_type       as enum ('operator', 'landlord', 'agent', 'vendor', 'other');
create type public.contact_role       as enum ('acquisitions', 'landlord', 'solicitor', 'agent', 'finance', 'other');
create type public.use_class          as enum ('E', 'sui_generis_pub_bar', 'sui_generis_nightclub', 'sui_generis_hot_food', 'A3', 'A4', 'A5', 'other');
create type public.licence_status     as enum ('held', 'late', 'none');
create type public.tenure_type        as enum ('freehold', 'leasehold', 'assignment', 'new_letting');
create type public.listing_status     as enum ('available', 'under_offer', 'let', 'sold', 'withdrawn');
create type public.requirement_status as enum ('active', 'on_hold', 'satisfied', 'withdrawn');
create type public.deal_stage         as enum ('lead', 'viewing', 'offer', 'heads_of_terms', 'legal', 'completed', 'fell_through');
create type public.activity_type      as enum ('call', 'email', 'viewing', 'note', 'meeting', 'task');
create type public.match_status       as enum ('suggested', 'shortlisted', 'rejected', 'converted');
create type public.entity_type        as enum ('company', 'contact', 'listing', 'requirement', 'deal');

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tenancy: agencies + members
-- ─────────────────────────────────────────────────────────────────────────────
create table public.agencies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.agency_members (
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.member_role not null default 'agent',
  created_at  timestamptz not null default now(),
  primary key (agency_id, user_id)
);
create index agency_members_user_idx on public.agency_members(user_id);

-- Helper functions (SECURITY DEFINER so they bypass RLS and don't recurse on
-- agency_members policies). search_path locked to '' per Supabase guidance.
create or replace function public.auth_agency_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select agency_id from public.agency_members where user_id = auth.uid();
$$;

create or replace function public.is_agency_admin(p_agency_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Companies & contacts
-- ─────────────────────────────────────────────────────────────────────────────
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  name        text not null,
  type        public.company_type not null default 'operator',
  sector_tags text[] not null default '{}',
  website     text,
  phone       text,
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index companies_agency_idx on public.companies(agency_id);

create table public.contacts (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete set null,
  first_name  text not null,
  last_name   text,
  email       text,
  phone       text,
  role        public.contact_role not null default 'other',
  notes       text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index contacts_agency_idx on public.contacts(agency_id);
create index contacts_company_idx on public.contacts(company_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Listings (supply)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.listings (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null, -- landlord / vendor
  title           text not null,
  address_line1   text,
  address_line2   text,
  town            text,
  region          text,
  postcode        text,
  lat             double precision,
  lng             double precision,
  size_sqft       numeric(10,2),
  size_sqm        numeric(10,2),
  frontage_ft     numeric(8,2),
  use_class       public.use_class not null default 'E',
  licence         public.licence_status not null default 'none',
  licence_hours   text,
  capacity        integer,
  covers_internal integer,
  covers_external integer,
  kitchen_extraction boolean not null default false,
  three_phase_power  boolean not null default false,
  gas             boolean not null default false,
  tenure          public.tenure_type not null default 'leasehold',
  tied            boolean not null default false,
  rent            numeric(12,2),
  premium         numeric(12,2),
  fixtures_fittings numeric(12,2),
  goodwill        numeric(12,2),
  rateable_value  numeric(12,2),
  epc_rating      text,
  service_charge  numeric(12,2),
  turnover        numeric(12,2),
  barrelage       numeric(10,2),
  status          public.listing_status not null default 'available',
  description     text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index listings_agency_idx on public.listings(agency_id);
create index listings_status_idx on public.listings(agency_id, status);
create index listings_town_idx   on public.listings(agency_id, town);

-- ─────────────────────────────────────────────────────────────────────────────
-- Requirements (demand)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.requirements (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  company_id      uuid references public.companies(id) on delete set null, -- operator
  contact_id      uuid references public.contacts(id) on delete set null,
  title           text not null,
  target_towns    text[] not null default '{}',
  target_regions  text[] not null default '{}',
  min_sqft        numeric(10,2),
  max_sqft        numeric(10,2),
  min_covers      integer,
  max_covers      integer,
  use_classes     public.use_class[] not null default '{}',
  max_rent        numeric(12,2),
  max_premium     numeric(12,2),
  tenure_prefs    public.tenure_type[] not null default '{}',
  notes           text,
  status          public.requirement_status not null default 'active',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index requirements_agency_idx on public.requirements(agency_id);
create index requirements_company_idx on public.requirements(company_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Deals (links supply + demand + parties)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.deals (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  listing_id      uuid references public.listings(id) on delete set null,
  requirement_id  uuid references public.requirements(id) on delete set null,
  company_id      uuid references public.companies(id) on delete set null,
  title           text not null,
  stage           public.deal_stage not null default 'lead',
  value           numeric(12,2),
  hot_terms       text,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index deals_agency_idx on public.deals(agency_id);
create index deals_stage_idx  on public.deals(agency_id, stage);

-- ─────────────────────────────────────────────────────────────────────────────
-- Activities (polymorphic timeline)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  type          public.activity_type not null default 'note',
  subject       text,
  body          text,
  entity_type   public.entity_type,
  entity_id     uuid,
  occurred_at   timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index activities_agency_idx on public.activities(agency_id);
create index activities_entity_idx on public.activities(agency_id, entity_type, entity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Matches (generated supply↔demand candidates)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  agency_id       uuid not null references public.agencies(id) on delete cascade,
  listing_id      uuid not null references public.listings(id) on delete cascade,
  requirement_id  uuid not null references public.requirements(id) on delete cascade,
  score           numeric(5,2) not null default 0,
  reasons         jsonb not null default '[]',
  status          public.match_status not null default 'suggested',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (listing_id, requirement_id)
);
create index matches_agency_idx on public.matches(agency_id);
create index matches_listing_idx on public.matches(listing_id);
create index matches_requirement_idx on public.matches(requirement_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
create trigger trg_agencies_updated     before update on public.agencies     for each row execute function public.set_updated_at();
create trigger trg_companies_updated     before update on public.companies     for each row execute function public.set_updated_at();
create trigger trg_contacts_updated      before update on public.contacts      for each row execute function public.set_updated_at();
create trigger trg_listings_updated      before update on public.listings      for each row execute function public.set_updated_at();
create trigger trg_requirements_updated  before update on public.requirements  for each row execute function public.set_updated_at();
create trigger trg_deals_updated         before update on public.deals         for each row execute function public.set_updated_at();
create trigger trg_matches_updated       before update on public.matches       for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.agencies        enable row level security;
alter table public.agency_members  enable row level security;
alter table public.companies       enable row level security;
alter table public.contacts        enable row level security;
alter table public.listings        enable row level security;
alter table public.requirements    enable row level security;
alter table public.deals           enable row level security;
alter table public.activities      enable row level security;
alter table public.matches         enable row level security;

-- agencies: members read; admins update/delete (creation handled by signup trigger)
create policy agencies_select on public.agencies
  for select to authenticated using (id in (select public.auth_agency_ids()));
create policy agencies_update on public.agencies
  for update to authenticated using (public.is_agency_admin(id)) with check (public.is_agency_admin(id));
create policy agencies_delete on public.agencies
  for delete to authenticated using (public.is_agency_admin(id));

-- agency_members: members read their agencies' rosters; admins manage
create policy members_select on public.agency_members
  for select to authenticated using (agency_id in (select public.auth_agency_ids()));
create policy members_insert on public.agency_members
  for insert to authenticated with check (public.is_agency_admin(agency_id));
create policy members_update on public.agency_members
  for update to authenticated using (public.is_agency_admin(agency_id)) with check (public.is_agency_admin(agency_id));
create policy members_delete on public.agency_members
  for delete to authenticated using (public.is_agency_admin(agency_id));

-- Domain tables: any member of the row's agency can do everything within it.
create policy companies_all on public.companies
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy contacts_all on public.contacts
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy listings_all on public.listings
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy requirements_all on public.requirements
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy deals_all on public.deals
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy activities_all on public.activities
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));
create policy matches_all on public.matches
  for all to authenticated using (agency_id in (select public.auth_agency_ids())) with check (agency_id in (select public.auth_agency_ids()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed sample data into an agency (called on signup; bypasses RLS as definer)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.seed_agency(p_agency_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c_riverside uuid; c_landlord uuid;
  l_soho uuid; l_camden uuid;
begin
  insert into public.companies (agency_id, name, type, sector_tags, created_by)
    values (p_agency_id, 'Riverside Taverns Ltd', 'operator', array['pub','bar'], p_user_id)
    returning id into c_riverside;
  insert into public.companies (agency_id, name, type, sector_tags, created_by)
    values (p_agency_id, 'Metro Estates LLP', 'landlord', array['landlord'], p_user_id)
    returning id into c_landlord;
  insert into public.companies (agency_id, name, type, sector_tags, created_by)
    values (p_agency_id, 'Brewhouse Collective', 'operator', array['restaurant','brewery'], p_user_id);

  insert into public.contacts (agency_id, company_id, first_name, last_name, email, role, created_by)
    values (p_agency_id, c_riverside, 'James', 'Hartley', 'james@riversidetaverns.co.uk', 'acquisitions', p_user_id),
           (p_agency_id, c_landlord, 'Priya', 'Nair', 'priya@metroestates.co.uk', 'landlord', p_user_id);

  insert into public.listings (agency_id, company_id, title, town, region, postcode, size_sqft, use_class, licence, covers_internal, covers_external, tenure, rent, premium, status, created_by)
    values (p_agency_id, c_landlord, 'Corner bar, Soho', 'London', 'Greater London', 'W1D 4SB', 1850, 'sui_generis_pub_bar', 'held', 80, 16, 'leasehold', 95000, 120000, 'available', p_user_id)
    returning id into l_soho;
  insert into public.listings (agency_id, company_id, title, town, region, postcode, size_sqft, use_class, licence, covers_internal, tenure, rent, status, created_by)
    values (p_agency_id, c_landlord, 'Restaurant unit, Camden', 'London', 'Greater London', 'NW1 8AH', 1200, 'E', 'none', 54, 'new_letting', 62000, 'available', p_user_id)
    returning id into l_camden;

  insert into public.requirements (agency_id, company_id, title, target_towns, min_sqft, max_sqft, use_classes, max_rent, tenure_prefs, status, created_by)
    values (p_agency_id, c_riverside, 'Wet-led bar, Central London', array['London'], 1500, 2500, array['sui_generis_pub_bar']::public.use_class[], 110000, array['leasehold']::public.tenure_type[], 'active', p_user_id);

  insert into public.deals (agency_id, listing_id, company_id, title, stage, value, created_by)
    values (p_agency_id, l_soho, c_riverside, 'Riverside × Soho corner bar', 'viewing', 95000, p_user_id);

  insert into public.activities (agency_id, type, subject, entity_type, entity_id, created_by)
    values (p_agency_id, 'note', 'Workspace created with sample data', 'company', c_riverside, p_user_id),
           (p_agency_id, 'viewing', 'Initial viewing booked — Soho corner bar', 'listing', l_soho, p_user_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- On signup: create the user's agency + admin membership, seed sample data.
-- Seeding is best-effort so it can never block account creation.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  new_agency_id uuid;
begin
  insert into public.agencies (name)
    values (coalesce(nullif(split_part(new.email, '@', 1), ''), 'New') || '''s agency')
    returning id into new_agency_id;

  insert into public.agency_members (agency_id, user_id, role)
    values (new_agency_id, new.id, 'admin');

  begin
    perform public.seed_agency(new_agency_id, new.id);
  exception when others then
    null; -- never block signup on seed failure
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
