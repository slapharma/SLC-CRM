-- Global usage count for a contact role slug. Contacts are RLS-scoped per agency,
-- but contact_roles is system-wide, so an admin's own client can't see whether
-- another agency still uses a role. This definer helper counts across all agencies
-- so "Edit roles" can block deleting a role that is still in use anywhere.
create or replace function public.contact_role_in_use(p_slug text)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.contacts where role = p_slug;
$$;
revoke execute on function public.contact_role_in_use(text) from public, anon;
grant  execute on function public.contact_role_in_use(text) to authenticated;
