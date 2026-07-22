import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Refreshes the Supabase auth session on every request and propagates the
 * updated cookies onto the response. Called from src/proxy.ts (Next 16 renamed
 * Middleware -> Proxy). Uses the sync request/response cookie APIs available in
 * a proxy, NOT the async cookies() store.
 *
 * NOTE: per the Next.js docs, a proxy must not be the authorization boundary —
 * it only does the optimistic session refresh. Real auth checks live in the
 * (app) server layout.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No Supabase configured yet -> pass through so the site keeps working.
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getClaims().
  // getClaims() verifies the JWT locally against the project's asymmetric
  // (ES256) signing key — no Auth-server round trip on the hot path — and
  // still refreshes the session (writing new cookies via setAll) when the
  // access token has expired.
  await supabase.auth.getClaims();

  return response;
}
