-- Phase 2 — editable agent profiles + avatar storage
-- Adds phone + avatar to profiles, a public 'avatars' storage bucket, and an
-- admin RPC to edit an agent's name/email/phone/photo. Admin-gated like 0009.

alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists avatar_url text;

-- Public-read bucket for agent photos (uploaded by the admin from the browser).
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Storage RLS: anyone can read; signed-in users can manage objects in 'avatars'.
do $$ begin
  create policy "avatars_public_read" on storage.objects
    for select using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avatars_auth_insert" on storage.objects
    for insert to authenticated with check (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avatars_auth_update" on storage.objects
    for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avatars_auth_delete" on storage.objects
    for delete to authenticated using (bucket_id = 'avatars');
exception when duplicate_object then null; end $$;

-- Edit an agent's details (admin only — enforced via is_agency_admin).
create or replace function public.admin_update_agent(
  p_agency_id  uuid,
  p_user_id    uuid,
  p_email      text,
  p_full_name  text,
  p_phone      text,
  p_avatar_url text
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
     set email      = email_n,
         full_name  = nullif(trim(p_full_name), ''),
         phone      = nullif(trim(p_phone), ''),
         avatar_url = nullif(trim(p_avatar_url), ''),
         updated_at = now()
   where id = p_user_id;
end;
$$;

revoke execute on function public.admin_update_agent(uuid, uuid, text, text, text, text) from public, anon;
grant  execute on function public.admin_update_agent(uuid, uuid, text, text, text, text) to authenticated;
