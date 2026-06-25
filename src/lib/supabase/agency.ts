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
