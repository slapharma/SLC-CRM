import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * The current user's agency id (their first membership). RLS already scopes
 * agency_members to the caller, so this returns only an agency they belong to.
 * Returns null if the user has no agency.
 */
export async function currentAgencyId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  const { data } = await supabase
    .from("agency_members")
    .select("agency_id")
    .limit(1)
    .maybeSingle();
  return data?.agency_id ?? null;
}

export type AgentOption = { id: string; name: string; email: string | null };

/**
 * The agency roster as pickable agents (id + display name), sorted by name.
 * Resolves member user ids through `profiles` (the client cannot read
 * auth.users). Returns [] if the agency has no members or profiles.
 */
export async function getAgencyMembers(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<AgentOption[]> {
  const { data: members } = await supabase
    .from("agency_members")
    .select("user_id")
    .eq("agency_id", agencyId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  return (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? "Unknown agent",
      email: p.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
