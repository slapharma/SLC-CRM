-- ─────────────────────────────────────────────────────────────────────────────
-- Dummy data for manual/QA testing.   NOT a migration — run on demand:
--   Supabase MCP execute_sql, or psql -f supabase/seeds/dummy_data.sql
--
-- Creates ONE shared demo agency ("CDG demo") with 6 login-capable agents —
-- the real CDG Leisure team (Morris Greenberg, Sammy Weinbaum, Salvatore Di
-- Natale, David Kornbluth, Natasha Grech, Sophia Valenzuela), with real
-- cdgleisure.com emails / phone / LinkedIn — plus 50 companies and 75 contacts.
-- Every record gets a random lead agent; a random subset of the other agents
-- are attached as additional agents.
--
-- Disposals (the real CDG property book) are loaded separately by cdg_listings.sql,
-- which owns the demo agency's supply. Run that AFTER this file.
--
-- Idempotent + tenant-isolated: it only ever touches the demo agency and its 6
-- agents, and fully resets its companies/contacts on each run (safe to re-run any
-- time, and safe alongside other sessions — it never modifies real/other-agency
-- rows, and it leaves the CDG disposals seeded by cdg_listings.sql untouched).
--
-- The 6 agents log in with their real cdgleisure.com email / Demo!2026
-- (Morris Greenberg = admin; the rest are agents).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  demo_agency uuid;
  agent_ids   uuid[] := '{}';
  company_ids uuid[] := '{}';
  uid uuid;
  cid uuid;
  i   int;

  -- The real CDG Leisure team (agent1 = Morris = admin), real cdgleisure.com logins.
  emails    text[] := array['morris@cdgleisure.com','sammy@cdgleisure.com','salvatore@cdgleisure.com',
                            'davidk@cdgleisure.com','natasha@cdgleisure.com','sophia@scrollersocial.com'];
  fulln     text[] := array['Morris Greenberg','Sammy Weinbaum','Salvatore Di Natale',
                            'David Kornbluth','Natasha Grech','Sophia Valenzuela'];
  phones    text[] := array['0207 100 5520','0207 100 5520','0207 100 5520',
                            '0207 100 5520','0207 100 5520','0207 100 5520'];
  linkedins text[] := array[null,'https://www.linkedin.com/in/sammy-weinbaum-84298a26/',null,
                            null,'https://www.linkedin.com/in/natasha-grech-114851a2/',
                            'https://www.linkedin.com/in/sophiavalenzuela/']::text[];
  pw        text := 'Demo!2026';

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
  select id into demo_agency from public.agencies where name = 'CDG demo' limit 1;
  if demo_agency is null then
    insert into public.agencies (name) values ('CDG demo') returning id into demo_agency;
  end if;

  -- 2. Six login-capable agents (the real CDG team) ───────────────────────────
  -- (The signup trigger fires on insert and spins up a personal agency per user;
  --  we delete those in step 3 so each agent belongs only to the demo agency.)
  for i in 1..6 loop
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

    -- Real contact details (phone + LinkedIn) so a reseed reproduces live state.
    insert into public.profiles (id, email, full_name, phone, linkedin_url)
      values (uid, emails[i], fulln[i], phones[i], linkedins[i])
      on conflict (id) do update set
        email = excluded.email, full_name = excluded.full_name,
        phone = excluded.phone, linkedin_url = excluded.linkedin_url, updated_at = now();
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
      agent_ids[1+floor(random()*6)::int],
      agent_ids[1+floor(random()*6)::int]
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
      agent_ids[1+floor(random()*6)::int],
      agent_ids[1+floor(random()*6)::int]
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
