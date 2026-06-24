import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { importDisposalFromUrl, isCdgPropertyUrl } from "@/lib/disposals/import";

/**
 * POST /api/disposals/import  { "url": "https://www.cdgleisure.com/find-a-property/..." }
 *
 * Programmatic equivalent of the import Server Action — handy for scripted/bulk
 * ingestion. Next 16: route handlers aren't cached by default and `request.json()`
 * needs no body parser. Auth is verified here (the handler is publicly reachable).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
  }

  let url: string;
  try {
    const body = (await request.json()) as { url?: unknown };
    url = String(body.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Body must be JSON: { url }." }, { status: 400 });
  }
  if (!url || !isCdgPropertyUrl(url)) {
    return NextResponse.json({ error: "A valid CDG property URL is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("agency_members")
    .select("agency_id")
    .limit(1)
    .maybeSingle();
  const agencyId = membership?.agency_id;
  if (!agencyId) {
    return NextResponse.json(
      { error: "No agency linked to this account." },
      { status: 403 },
    );
  }

  try {
    const { id, rehost } = await importDisposalFromUrl(url, supabase, agencyId, {
      createdBy: user.id,
    });
    return NextResponse.json({
      id,
      rehosted: rehost?.uploaded ?? 0,
      warnings: rehost?.failures ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
