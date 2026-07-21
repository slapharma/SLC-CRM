import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { SUPABASE_URL } from "./config";

/**
 * Service-role Supabase client — bypasses RLS. Server-only; used exclusively by
 * the public requirement-intake action, which has no signed-in user. Returns
 * null when SUPABASE_SERVICE_ROLE_KEY isn't configured.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createSupabaseClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
