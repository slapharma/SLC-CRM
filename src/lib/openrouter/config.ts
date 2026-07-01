import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type OpenRouterConfig = { apiKey: string; model: string };

/**
 * Fetch the caller's agency OpenRouter config server-side via the SECURITY
 * DEFINER RPC (so any agency member can run a Deep Dive without direct access to
 * the secret). Returns null when no key has been set in Admin.
 */
export async function getAgencyOpenRouter(
  supabase: SupabaseClient<Database>,
): Promise<OpenRouterConfig | null> {
  const { data } = await supabase.rpc("current_agency_openrouter");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.api_key) return null;
  return { apiKey: row.api_key, model: row.model || "perplexity/sonar" };
}
