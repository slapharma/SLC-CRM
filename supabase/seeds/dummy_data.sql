-- ─────────────────────────────────────────────────────────────────────────────
-- Dummy data for manual/QA testing.   NOT a migration — run on demand:
--   Supabase MCP execute_sql, or psql -f supabase/seeds/dummy_data.sql
--
-- Creates ONE shared demo agency ("SLC CDG Demo") with 3 login-capable agents —
-- the real CDG Leisure team (Morris Greenberg, Salvatore Di Natale, David
-- Kornbluth) — plus 50 companies and 75 contacts. Every record gets a random lead
-- agent; a random subset of the other agents are attached as additional agents.
--
-- Disposals (the real CDG property book) are loaded separately by cdg_listings.sql,
-- which owns the demo agency's supply. Run that AFTER this file.
--
-- Idempotent + tenant-isolated: it only ever touches the demo agency and its 6
-- agents, and fully resets its companies/contacts on each run (safe to re-run any
-- time, and safe alongside other sessions — it never modifies real/other-agency
-- rows, and it leaves the CDG disposals seeded by cdg_listings.sql untouched).
--
-- The 3 agents log in with:  agent1@slc.test … agent3@slc.test  /  Demo!2026
-- (agent1=Morris Greenberg/admin, agent2=Salvatore Di Natale, agent3=David Kornbluth)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  demo_agency uuid;
  agent_ids   uuid[] := '{}';
  company_ids uuid[] := '{}';
  uid uuid;
  cid uuid;
  i   int;

  -- The real CDG Leisure team, scraped from the source listings (agent1 = admin).
  emails  text[] := array['agent1@slc.test','agent2@slc.test','agent3@slc.test'];
  fulln   text[] := array['Morris Greenberg','Salvatore Di Natale','David Kornbluth'];
  pw      text := 'Demo!2026';

  ctypes  public.company_type[] := array['operator','landlord','agent','vendor','other']::public.company_type[];
  croles  public.contact_role[] := array['acquisitions','landlord','solicitor','agent','finance','other']::public.contact_role[];
  places  text[] := array['Riverside','Camden','Soho','Shoreditch','Mayfair','Brixton','Clapham',
                          'Islington','Hackney','Greenwich','Notting Hill','Fulham','Chelsea',
                          'Peckham','Dalston','Wapping','Bermondsey','Ealing','Richmond','Croydon'];
  concepts text[] := array['Taverns','Estates','Leisure','Hospitality','Inns','Brewing Co','Bars',
                           'Kitchens','Pubs','Group','Holdings','Ventures','Dining','Properties','Capital'];
  suffixes text[] := array['Ltd','LLP','Group','& Co',''];
  tags    text[] := array['pub','bar','restaurant','nightclub','hotel','cafe','brewery','cinema','gym'];

  firstn  text[] := array['James','Priya','Sarah','Tom','Aisha','Liam','Chloe','Raj','Emma','Noah',
                          'Grace','Ben','Maya','Leo','Hannah','Sam','Zoe','Adam','Ruby','Jack'];
  lastn   text[] := array['Hartley','Nair','Coombes','Wallace','Khan','Doyle','Fletcher','Mehta',
                          'Bishop','Ramsey','Greco','Okafor','Lambert','Power','Sturgess','Vale',
                          'Ashby','Quinn','Renshaw','Maddox'];
begin
  -- 1. Shared demo agency (find-or-create) ───────────────────────────────────
  select id into demo_agency from public.agencies where name = 'SLC CDG Demo' limit 1;
  if demo_agency is null then
    insert into public.agencies (name) values ('SLC CDG Demo') returning id into demo_agency;
  end if;

  -- 2. Three login-capable agents (the real CDG team) ─────────────────────────
  -- (The signup trigger fires on insert and spins up a personal agency per user;
  --  we delete those in step 3 so each agent belongs only to the demo agency.)
  for i in 1..3 loop
    select id into uid from auth.users where email = emails[i];
    if uid is null then
      uid := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        emails[i], crypt(pw, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', fulln[i]), now(), now(),
        '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), uid, uid::text,
        jsonb_build_object('sub', uid::text, 'email', emails[i]), 'email', now(), now(), now()
      );
    end if;
    agent_ids := array_append(agent_ids, uid);

    insert into public.agency_members (agency_id, user_id, role)
      values (demo_agency, uid, (case when i = 1 then 'admin' else 'agent' end)::public.member_role)
      on conflict (agency_id, user_id) do nothing;
  end loop;

  -- 3. Drop any non-demo (trigger-seeded personal) agencies for these agents ──
  delete from public.agencies a
   where a.id <> demo_agency
     and a.id in (select agency_id from public.agency_members where user_id = any(agent_ids));

  -- 4. Reset demo-agency data (join tables cascade via FK) ─────────────────────
  --    Disposals are owned by cdg_listings.sql, so we leave that supply untouched.
  delete from public.contacts  where agency_id = demo_agency;
  delete from public.companies where agency_id = demo_agency;

  -- 5. 50 companies ────────────────────────────────────────────────────────────
  for i in 1..50 loop
    insert into public.companies (agency_id, name, type, sector_tags, website, phone, lead_agent_id, created_by)
    values (
      demo_agency,
      trim(places[1+floor(random()*20)::int] || ' ' || concepts[1+floor(random()*15)::int]
           || ' ' || suffixes[1+floor(random()*5)::int]),
      ctypes[1+floor(random()*5)::int],
      array[tags[1+floor(random()*9)::int], tags[1+floor(random()*9)::int]],
      'https://example-' || i || '.co.uk',
      '+44 20 7' || lpad((floor(random()*900000)+100000)::int::text, 6, '0'),
      agent_ids[1+floor(random()*3)::int],
      agent_ids[1+floor(random()*3)::int]
    ) returning id into cid;
    company_ids := array_append(company_ids, cid);
  end loop;

  -- 6. 75 contacts (random company → some companies get several, some none) ────
  for i in 1..75 loop
    insert into public.contacts (agency_id, company_id, first_name, last_name, email, phone, role, lead_agent_id, created_by)
    values (
      demo_agency,
      case when random() < 0.1 then null else company_ids[1+floor(random()*50)::int] end,
      firstn[1+floor(random()*20)::int],
      lastn[1+floor(random()*20)::int],
      'contact' || i || '@slc.test',
      '+44 7' || lpad((floor(random()*900000000)+100000000)::bigint::text, 9, '0'),
      croles[1+floor(random()*6)::int],
      agent_ids[1+floor(random()*3)::int],
      agent_ids[1+floor(random()*3)::int]
    );
  end loop;

  -- 7. Additional agents (collaborators) — random subset, never the lead ───────
  --    (Disposal collaborators are assigned by cdg_listings.sql, which owns supply.)
  insert into public.company_agents (agency_id, company_id, user_id)
    select c.agency_id, c.id, m.user_id
      from public.companies c join public.agency_members m on m.agency_id = c.agency_id
     where c.agency_id = demo_agency and m.user_id is distinct from c.lead_agent_id and random() < 0.22
    on conflict do nothing;

  insert into public.contact_agents (agency_id, contact_id, user_id)
    select c.agency_id, c.id, m.user_id
      from public.contacts c join public.agency_members m on m.agency_id = c.agency_id
     where c.agency_id = demo_agency and m.user_id is distinct from c.lead_agent_id and random() < 0.18
    on conflict do nothing;

  raise notice 'Seed complete: agency %, % agents, 50 companies, 75 contacts (disposals via cdg_listings.sql).',
    demo_agency, array_length(agent_ids, 1);
end $$;
