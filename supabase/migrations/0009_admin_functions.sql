-- Phase 2 — admin user management
-- SECURITY DEFINER RPCs so an agency admin can create agents and reset their
-- passwords from the app, without the app holding a service-role key. Each
-- function authorises the CALLER via is_agency_admin(p_agency_id) (which checks
-- auth.uid()), so an admin can only act within agencies they administer.
-- pgcrypto lives in the `extensions` schema (search_path is locked to '').

create or replace function public.admin_create_agent(
  p_agency_id uuid,
  p_email     text,
  p_password  text,
  p_full_name text,
  p_role      public.member_role default 'agent'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_uid uuid;
  email_n text := lower(trim(p_email));
begin
  if not public.is_agency_admin(p_agency_id) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if coalesce(email_n, '') = '' then raise exception 'Email is required'; end if;
  if coalesce(p_password, '') = '' then raise exception 'Password is required'; end if;
  if exists (select 1 from auth.users where email = email_n) then
    raise exception 'A user with that email already exists';
  end if;

  new_uid := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
    email_n, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', nullif(trim(p_full_name), '')), now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), new_uid, new_uid::text,
            jsonb_build_object('sub', new_uid::text, 'email', email_n), 'email', now(), now(), now());
  insert into public.profiles (id, email, full_name)
    values (new_uid, email_n, coalesce(nullif(trim(p_full_name), ''), split_part(email_n, '@', 1)))
    on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;
  insert into public.agency_members (agency_id, user_id, role)
    values (p_agency_id, new_uid, coalesce(p_role, 'agent'::public.member_role))
    on conflict (agency_id, user_id) do nothing;
  return new_uid;
end;
$$;

create or replace function public.admin_set_agent_password(
  p_agency_id uuid,
  p_user_id   uuid,
  p_password  text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_agency_admin(p_agency_id) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if coalesce(p_password, '') = '' then raise exception 'Password is required'; end if;
  if not exists (
    select 1 from public.agency_members where agency_id = p_agency_id and user_id = p_user_id
  ) then
    raise exception 'That user is not a member of this agency';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user_id;
end;
$$;

-- Callable by signed-in users; authorisation is enforced inside each function.
revoke execute on function public.admin_create_agent(uuid, text, text, text, public.member_role) from public, anon;
revoke execute on function public.admin_set_agent_password(uuid, uuid, text) from public, anon;
grant  execute on function public.admin_create_agent(uuid, text, text, text, public.member_role) to authenticated;
grant  execute on function public.admin_set_agent_password(uuid, uuid, text) to authenticated;
