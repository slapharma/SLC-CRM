-- ─────────────────────────────────────────────────────────────────────────────
-- Dummy data — 2 MANAGER-role users for the shared "CDG demo" agency.   NOT a
-- migration — run on demand AFTER 0011_manager_role.sql has committed (the
-- 'manager' enum value must already exist):
--   Supabase MCP execute_sql, or psql -f supabase/seeds/dummy_managers.sql
--
-- Logins:  agent4@slc.test (Daniel Goldberg) · agent5@slc.test (Rachel Stein)
--          password: Demo!2026   ·   role: manager
--
-- Idempotent + tenant-isolated: only touches the demo agency and these 2 users.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  demo_agency uuid;
  uid uuid;
  i   int;
  emails text[] := array['agent4@slc.test','agent5@slc.test'];
  fulln  text[] := array['Daniel Goldberg','Rachel Stein'];
  pw     text   := 'Demo!2026';
begin
  select id into demo_agency from public.agencies where name = 'CDG demo' limit 1;
  if demo_agency is null then
    raise exception 'CDG demo agency not found — run dummy_data.sql first.';
  end if;

  for i in 1..2 loop
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

    -- The signup trigger spins up a personal agency per new user; drop it so each
    -- manager belongs only to the demo agency.
    delete from public.agencies a
     where a.id <> demo_agency
       and a.id in (select agency_id from public.agency_members where user_id = uid);

    insert into public.agency_members (agency_id, user_id, role)
      values (demo_agency, uid, 'manager'::public.member_role)
      on conflict (agency_id, user_id) do update set role = 'manager'::public.member_role;
  end loop;

  raise notice 'Manager seed complete: 2 managers added to agency %.', demo_agency;
end $$;
