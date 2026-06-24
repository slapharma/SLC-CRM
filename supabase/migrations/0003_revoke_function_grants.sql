-- Supabase grants EXECUTE to anon/authenticated explicitly via default privileges,
-- so 0002's `revoke ... from public` didn't remove them. Revoke from the roles by name.
-- Internal functions (run only by the signup trigger, as owner) -> no role needs them.
revoke execute on function public.seed_agency(uuid, uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- RLS helpers -> needed by `authenticated` (policies call them), never by `anon`.
revoke execute on function public.auth_agency_ids() from anon;
revoke execute on function public.is_agency_admin(uuid) from anon;
