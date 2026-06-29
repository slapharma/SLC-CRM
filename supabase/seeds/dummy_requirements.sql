-- ─────────────────────────────────────────────────────────────────────────────
-- Dummy requirements (demand side) for the "CDG demo" agency. NOT a migration —
-- run on demand: Supabase MCP execute_sql, or psql -f this file.
--
-- 20 realistic UK leisure acquisition briefs, each linked to one of the demo
-- agency's operator companies (round-robin) and owned by that company's lead
-- agent. Towns/tenure/budget bands are deliberately drawn to MATCH the real CDG
-- property book seeded by cdg_listings.sql (57 of 81 listings are London;
-- tenure split lease_assignment / new_lease), so the matching engine, /matches,
-- and "Create deal from a match" all demonstrate against live supply.
--
-- Idempotent + tenant-isolated: resets only the demo agency's requirements.
-- Run AFTER dummy_data.sql (operators) and cdg_listings.sql (disposals).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  demo uuid;
  n_ops int;
begin
  select id into demo from public.agencies where name = 'CDG demo' limit 1;
  if demo is null then
    raise exception 'Demo agency "CDG demo" not found — run dummy_data.sql first.';
  end if;

  select count(*) into n_ops
    from public.companies where agency_id = demo and type = 'operator';
  if n_ops = 0 then
    raise exception 'No operator companies in the demo agency — run dummy_data.sql first.';
  end if;

  delete from public.requirements where agency_id = demo;

  with ops as (
    select id, lead_agent_id, row_number() over (order by created_at, id) rn
      from public.companies
     where agency_id = demo and type = 'operator'
  ),
  data(rn, title, status, towns, regions, ptypes, uclasses, tenures, fitouts,
       min_sqft, max_sqft, min_cov, max_cov, max_rent, max_prem, max_guide, notes) as (
    values
      (1,  'Artisan coffee — Central London rollout', 'active',
        array['London','Soho','Fitzrovia'], array['Greater London'], array['café'],
        array['E'], array['leasehold','assignment'], array['part_fitted','shell'],
        500, 1500, 15, 50, 85000, 50000, null,
        'Specialty coffee operator seeking high-footfall Zone 1 units; A-grade frontage, extraction not essential.'),
      (2,  'Neighbourhood Italian — SW London', 'active',
        array['Clapham','Wandsworth','Fulham','London'], array['Greater London'], array['restaurant'],
        array['E'], array['leasehold','assignment'], array['fully_fitted','part_fitted'],
        1500, 3200, 50, 120, 110000, 95000, null,
        'Established trattoria group; prefers ex-restaurant with kitchen extraction in place.'),
      (3,  'Craft beer taproom — East London', 'active',
        array['Shoreditch','Hackney','Dalston','London'], array['Greater London'], array['bar'],
        array['sui_generis_pub_bar'], array['new_letting','leasehold'], array['shell','part_fitted'],
        1200, 4000, 40, 150, 120000, null, null,
        'Independent brewery taproom; railway arches / industrial units welcome; needs premises-licence potential.'),
      (4,  'Premium cocktail bar — West End', 'active',
        array['Soho','Mayfair','Fitzrovia','London'], array['Greater London'], array['bar'],
        array['sui_generis_pub_bar'], array['assignment','leasehold'], array['fully_fitted'],
        1000, 2500, 40, 100, 140000, 150000, null,
        'Late-licence cocktail concept; existing bar fit-out preferred to reduce capex.'),
      (5,  'Fast-casual burger — London + commuter belt', 'active',
        array['London','Kingston','Reading','Romford'], array['Greater London','South East'], array['restaurant'],
        array['E'], array['leasehold','assignment'], array['fully_fitted','part_fitted'],
        1000, 2400, 40, 90, 95000, 80000, null,
        'Rolling out five sites; high-street or retail-park pitches; drive-thru a bonus.'),
      (6,  'Wine bar & deli — prime SW', 'active',
        array['South Kensington','Chelsea','London'], array['Greater London'], array['café','bar'],
        array['E'], array['assignment','leasehold'], array['part_fitted'],
        700, 1800, 20, 60, 100000, 120000, null,
        'Affluent residential pitches; small-plates plus retail wine.'),
      (7,  'Dessert & hot-food takeaway — outer London', 'active',
        array['Ilford','Romford','Croydon','London'], array['Greater London'], array['takeaway'],
        array['sui_generis_hot_food'], array['leasehold','assignment'], array['shell','part_fitted'],
        400, 1200, 0, 20, 55000, 40000, null,
        'Franchised dessert parlour; needs hot-food / sui-generis consent and extraction.'),
      (8,  'Boutique fitness & wellness — London', 'active',
        array['London'], array['Greater London'], array['gym','leisure'],
        array[]::text[], array['new_letting','leasehold'], array['shell'],
        3000, 7000, null, null, 130000, null, null,
        'Boutique studio operator; basement / first-floor acceptable; 24/7 access valued.'),
      (9,  'Artisan bakery café — North London', 'active',
        array['Islington','Camden','East Finchley','London'], array['Greater London'], array['café'],
        array['E'], array['leasehold','assignment'], array['part_fitted','shell'],
        800, 2000, 20, 60, 80000, 55000, null,
        'Production bakery plus café; needs venting and 3-phase power.'),
      (10, 'Regional gastropub group — Home Counties', 'active',
        array['Sevenoaks','Brentwood','Chelmsford','Reading'], array['South East','East of England'], array['pub'],
        array['sui_generis_pub_bar'], array['freehold','new_letting'], array['fully_fitted'],
        2000, 6000, 60, 160, 95000, null, 1200000,
        'Acquisitive managed-pub group; freehold or long leasehold; trade gardens essential.'),
      (11, 'Late-night nightclub — Central London', 'on_hold',
        array['Soho','London'], array['Greater London'], array['nightclub','bar'],
        array['sui_generis_nightclub'], array['assignment','leasehold'], array['fully_fitted'],
        3000, 9000, 100, 400, 160000, 200000, null,
        'Seeking existing late-licence club premises; capacity 300+; on hold pending funding.'),
      (12, 'Ramen & Asian fast-casual — West End', 'active',
        array['Soho','Fitzrovia','London'], array['Greater London'], array['restaurant'],
        array['E'], array['leasehold','assignment'], array['part_fitted','fully_fitted'],
        900, 2200, 30, 80, 105000, 90000, null,
        'Counter-service ramen; high lunchtime footfall; extraction required.'),
      (13, 'Premium steakhouse — Mayfair / City', 'active',
        array['Mayfair','London'], array['City of London'], array['restaurant'],
        array['E'], array['assignment','leasehold'], array['fully_fitted'],
        3500, 8000, 120, 250, 250000, 300000, null,
        'Destination steakhouse; landmark space; private dining a plus.'),
      (14, 'All-day brunch — coastal', 'active',
        array['Brighton','Bournemouth'], array['South East','South West'], array['café','restaurant'],
        array['E'], array['leasehold','assignment'], array['part_fitted','fully_fitted'],
        1500, 3500, 50, 120, 75000, 70000, null,
        'Seaside brunch and cocktails; terrace / sea view prioritised.'),
      (15, 'Sports bar — regional cities', 'active',
        array['Leeds','Birmingham','Hull'], array['Yorkshire','West Midlands'], array['bar','pub'],
        array['sui_generis_pub_bar'], array['new_letting','leasehold'], array['shell','part_fitted'],
        2500, 6000, 80, 250, 90000, null, null,
        'Big-screen sports and American grill; city-centre leisure schemes.'),
      (16, 'Wood-fired pizza — London + SW', 'active',
        array['London','Kingston','Wandsworth'], array['Greater London'], array['restaurant'],
        array['E'], array['leasehold','assignment'], array['part_fitted','fully_fitted'],
        1200, 2800, 45, 110, 100000, 85000, null,
        'Neighbourhood pizzeria; ex-restaurant with extraction ideal.'),
      (17, 'Private members'' club — Mayfair', 'on_hold',
        array['Mayfair','London'], array['Greater London'], array['bar','leisure'],
        array['sui_generis_pub_bar'], array['assignment','leasehold'], array['fully_fitted'],
        4000, 10000, 100, 300, 350000, 500000, null,
        'Multi-floor members'' club; discreet entrance; on hold pending board sign-off.'),
      (18, 'Health food & juice bar — Zone 1', 'active',
        array['London','Soho','Fitzrovia'], array['Greater London'], array['café','takeaway'],
        array['E'], array['leasehold','assignment'], array['shell','part_fitted'],
        400, 1000, 10, 30, 70000, 35000, null,
        'Grab-and-go wellness; office-dense pitches; small footprint.'),
      (19, 'Managed pub co — freehold acquisitions', 'active',
        array['London'], array['United Kingdom'], array['pub'],
        array['sui_generis_pub_bar'], array['freehold'], array['fully_fitted'],
        1500, 8000, 40, 250, null, null, 2500000,
        'Freehold-only mandate; community / wet-led pubs; national remit.'),
      (20, 'Coffee chain — multi-site expansion', 'satisfied',
        array['London','Reading','Romford','Kingston'], array['Greater London','South East'], array['café'],
        array['E'], array['leasehold','assignment'], array['part_fitted','fully_fitted'],
        700, 1600, 20, 50, 85000, 60000, null,
        'Ten-site expansion mandate — first acquisitions completed (mandate now satisfied).')
  )
  insert into public.requirements (
    agency_id, created_by, company_id, title, status,
    target_towns, target_regions, property_types, use_classes, tenure_prefs, fit_out_prefs,
    min_sqft, max_sqft, min_covers, max_covers, max_rent, max_premium, max_guide_price, notes
  )
  select
    demo, o.lead_agent_id, o.id, d.title, d.status::public.requirement_status,
    d.towns, d.regions, d.ptypes,
    d.uclasses::public.use_class[], d.tenures::public.tenure_type[], d.fitouts,
    d.min_sqft, d.max_sqft, d.min_cov, d.max_cov, d.max_rent, d.max_prem, d.max_guide, d.notes
  from data d
  join ops o on o.rn = ((d.rn - 1) % n_ops) + 1;

  raise notice 'Seeded 20 requirements for demo agency %.', demo;
end $$;
