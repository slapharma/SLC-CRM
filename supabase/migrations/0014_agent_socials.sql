-- Phase 2 — agent social links
-- Adds LinkedIn + X (Twitter) URLs to profiles and extends admin_update_agent to
-- set them. The two new params default to null so existing 6-arg callers (the
-- currently-deployed app) resolve to this function unchanged — no ambiguity.

alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists x_url text;

drop function if exists public.admin_update_agent(uuid, uuid, text, text, text, text);

create or replace function public.admin_update_agent(
  p_agency_id    uuid,
  p_user_id      uuid,
  p_email        text,
  p_full_name    text,
  p_phone        text,
  p_avatar_url   text,
  p_linkedin_url text default null,
  p_x_url        text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  email_n text := lower(trim(p_email));
begin
  if not public.is_agency_admin(p_agency_id) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.agency_members where agency_id = p_agency_id and user_id = p_user_id
  ) then
    raise exception 'That user is not a member of this agency';
  end if;
  if coalesce(email_n, '') = '' then raise exception 'Email is required'; end if;
  if exists (select 1 from auth.users where email = email_n and id <> p_user_id) then
    raise exception 'A user with that email already exists';
  end if;

  update auth.users
     set email = email_n,
         raw_user_meta_data =
           jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{full_name}',
                     to_jsonb(nullif(trim(p_full_name), ''))),
         updated_at = now()
   where id = p_user_id;
  update auth.identities
     set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(email_n)),
         updated_at = now()
   where user_id = p_user_id and provider = 'email';
  update public.profiles
     set email        = email_n,
         full_name    = nullif(trim(p_full_name), ''),
         phone        = nullif(trim(p_phone), ''),
         avatar_url   = nullif(trim(p_avatar_url), ''),
         linkedin_url = nullif(trim(p_linkedin_url), ''),
         x_url        = nullif(trim(p_x_url), ''),
         updated_at   = now()
   where id = p_user_id;
end;
$$;

revoke execute on function public.admin_update_agent(uuid, uuid, text, text, text, text, text, text) from public, anon;
grant  execute on function public.admin_update_agent(uuid, uuid, text, text, text, text, text, text) to authenticated;
