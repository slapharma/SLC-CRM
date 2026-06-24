-- Phase 1 reconciliation: the supply / Listing entity is a single table named
-- `disposals` (decision: disposals IS listings). Adopt the rich CDG-import schema
-- from the disposals workstream, add per-agency tenancy + RLS, and drop the thin
-- `listings` table created in 0001. The CDG importer keeps targeting `disposals`
-- (now agency-scoped). UI keeps the "Listings" label.

create extension if not exists pgcrypto;

-- 1) Tenant-scoped disposals table -------------------------------------------
create table public.disposals (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references public.agencies(id) on delete cascade,

  -- provenance
  source              text not null default 'cdg',
  source_ref          text,
  source_url          text,
  status              text,
  source_updated_at   timestamptz,

  -- identity / location
  title               text,
  summary             text,
  address_line        text,
  area                text,
  city                text,
  postcode            text,
  lat                 double precision,
  lng                 double precision,

  -- classification
  property_type       text,
  use_class           text,
  disposal_type       text not null default 'unknown'
                        check (disposal_type in ('freehold','new_lease','lease_assignment','sublease','unknown')),
  to_let              boolean not null default false,
  for_sale            boolean not null default false,

  -- commercials
  rent_pa             numeric,
  rent_raw            text,
  rent_period         text,
  premium             numeric,
  premium_raw         text,
  guide_price         numeric,
  price_qualifier     text
                        check (price_qualifier is null or price_qualifier in ('fixed','offers_in_region','offers_in_excess','on_application')),
  vat_applicable      boolean,
  rateable_value      numeric,
  business_rates      numeric,
  service_charge      numeric,
  estate_charge       numeric,
  parking_charge      numeric,

  -- lease
  tenure_raw          text,
  lease_term_years    integer,
  lease_expiry        date,
  rent_review_basis   text,
  next_rent_review    integer,
  inside_1954_act     boolean,

  -- size / capacity
  size_sqft           numeric,
  size_sqm            numeric,
  covers_internal     integer,
  covers_external     integer,
  floors              jsonb not null default '[]'::jsonb,

  -- leisure specifics
  licensing_notes     text,
  fit_out_state       text
                        check (fit_out_state is null or fit_out_state in ('fully_fitted','part_fitted','shell')),
  epc_rating          text,

  -- content
  description         text,
  location_description text,
  key_features        text[] not null default '{}',
  sections            jsonb not null default '[]'::jsonb,

  -- agent
  agent_name          text,
  agent_email         text,
  agent_phone         text,
  agent_photo         text,

  -- media
  images              jsonb not null default '[]'::jsonb,
  brochure_url        text,

  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- one row per source listing per agency (idempotent import per tenant)
  unique (agency_id, source, source_ref)
);

create index disposals_agency_idx        on public.disposals(agency_id);
create index disposals_status_idx        on public.disposals(agency_id, status);
create index disposals_disposal_type_idx on public.disposals(agency_id, disposal_type);
create index disposals_postcode_idx      on public.disposals(agency_id, postcode);

create trigger trg_disposals_updated before update on public.disposals
  for each row execute function public.set_updated_at();

alter table public.disposals enable row level security;
create policy disposals_all on public.disposals
  for all to authenticated
  using (agency_id in (select public.auth_agency_ids()))
  with check (agency_id in (select public.auth_agency_ids()));

-- 2) Storage bucket for re-hosted CDG media ----------------------------------
insert into storage.buckets (id, name, public) values ('disposals', 'disposals', true)
  on conflict (id) do nothing;
drop policy if exists "disposals media: authenticated write" on storage.objects;
create policy "disposals media: authenticated write" on storage.objects
  for all to authenticated
  using (bucket_id = 'disposals') with check (bucket_id = 'disposals');

-- 3) Repoint deals/matches from listings -> disposals, drop listings ----------
update public.deals set listing_id = null;   -- sample links to soon-dropped listings
delete from public.matches;                  -- no UI yet; clear any rows
drop table if exists public.listings cascade;  -- cascade drops the old FKs
drop type if exists public.listing_status;     -- only listings used it
alter table public.deals add constraint deals_listing_id_fkey
  foreign key (listing_id) references public.disposals(id) on delete set null;
alter table public.matches add constraint matches_listing_id_fkey
  foreign key (listing_id) references public.disposals(id) on delete cascade;

-- 4) Reseed sample supply as disposals ---------------------------------------
create or replace function public.seed_agency(p_agency_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c_riverside uuid; c_landlord uuid;
  d_soho uuid;
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

  insert into public.disposals (agency_id, source, source_ref, status, title, city, postcode,
                                size_sqft, use_class, disposal_type, to_let, rent_pa, premium,
                                covers_internal, covers_external, created_by)
    values (p_agency_id, 'seed', 'soho-1', 'Available', 'Corner bar, Soho', 'London', 'W1D 4SB',
            1850, 'Sui Generis', 'new_lease', true, 95000, 120000, 80, 16, p_user_id)
    returning id into d_soho;
  insert into public.disposals (agency_id, source, source_ref, status, title, city, postcode,
                                size_sqft, use_class, disposal_type, to_let, rent_pa, covers_internal, created_by)
    values (p_agency_id, 'seed', 'camden-1', 'Available', 'Restaurant unit, Camden', 'London', 'NW1 8AH',
            1200, 'Class E', 'new_lease', true, 62000, 54, p_user_id);

  insert into public.requirements (agency_id, company_id, title, target_towns, min_sqft, max_sqft,
                                   use_classes, max_rent, tenure_prefs, status, created_by)
    values (p_agency_id, c_riverside, 'Wet-led bar, Central London', array['London'], 1500, 2500,
            array['sui_generis_pub_bar']::public.use_class[], 110000,
            array['leasehold']::public.tenure_type[], 'active', p_user_id);

  insert into public.deals (agency_id, listing_id, company_id, title, stage, value, created_by)
    values (p_agency_id, d_soho, c_riverside, 'Riverside × Soho corner bar', 'viewing', 95000, p_user_id);

  insert into public.activities (agency_id, type, subject, entity_type, entity_id, created_by)
    values (p_agency_id, 'note', 'Workspace created with sample data', 'company', c_riverside, p_user_id),
           (p_agency_id, 'viewing', 'Initial viewing booked — Soho corner bar', 'listing', d_soho, p_user_id);
end;
$$;

revoke execute on function public.seed_agency(uuid, uuid) from anon, authenticated;
