-- Phase 1 hardening (from Supabase security advisor)
-- Lock down SECURITY DEFINER functions so they aren't callable via PostgREST RPC.
-- seed_agency/handle_new_user are internal only (the signup trigger runs them as
-- owner regardless of these grants). auth_agency_ids/is_agency_admin must remain
-- executable by `authenticated` because the RLS policies call them; we just drop
-- the PUBLIC/anon grant.

revoke execute on function public.seed_agency(uuid, uuid) from public;
revoke execute on function public.handle_new_user() from public;

revoke execute on function public.auth_agency_ids() from public;
grant  execute on function public.auth_agency_ids() to authenticated;

revoke execute on function public.is_agency_admin(uuid) from public;
grant  execute on function public.is_agency_admin(uuid) to authenticated;

-- Covering indexes for foreign keys used in joins (advisor: unindexed_foreign_keys).
create index if not exists deals_listing_idx        on public.deals(listing_id);
create index if not exists deals_requirement_idx    on public.deals(requirement_id);
create index if not exists deals_company_idx         on public.deals(company_id);
create index if not exists listings_company_idx      on public.listings(company_id);
create index if not exists requirements_contact_idx  on public.requirements(contact_id);
