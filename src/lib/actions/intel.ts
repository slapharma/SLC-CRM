"use server";

import { revalidatePath } from "next/cache";

import type { DisposalInsert } from "@/lib/disposals/cdg";
import { intelSourceById, pool } from "@/lib/intel/sources";
import { geocodeAddress } from "@/lib/maps/geocode";
import { refreshMatchesForListings } from "@/lib/actions/matches";
import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const CONCURRENCY = 6;
const RETRIES = 2;
const GEOCODE_CONCURRENCY = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Caller must be an admin of their agency; returns ids or an error state. */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." as const };
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." as const };
  const { data: isAdmin } = await supabase.rpc("is_agency_admin", {
    p_agency_id: agencyId,
  });
  if (isAdmin !== true) return { error: "Only agency admins can manage Market Intel." as const };
  return { supabase, user, agencyId };
}

/**
 * Re-scrape a partner source live and upsert into that source's intel rows for
 * the caller's agency, keyed on the (agency_id, source, source_ref) unique
 * index. Row ids are preserved, so deals, send history and attached
 * docs/areas/contacts survive a resync. Rows in the DB that the fresh scrape
 * no longer returns are marked Withdrawn (never deleted), and rows missing
 * coordinates are geocoded best-effort after the sync.
 */
export async function resyncIntelSource(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await requireAdmin();
  if ("error" in gate) return { error: gate.error };
  const { supabase, user, agencyId } = gate;

  const sourceId = String(formData.get("source") ?? "");
  const source = intelSourceById.get(sourceId);
  if (!source) return { error: "Unknown Market Intel source." };
  if (!source.scraper) {
    return { error: `${source.label} doesn't have a scraper yet — coming soon.` };
  }

  let urls: string[];
  try {
    urls = await source.scraper.fetchUrls();
  } catch (err) {
    return { error: `Couldn't enumerate ${source.label}: ${(err as Error).message}` };
  }

  const failures: string[] = [];
  const failedUrls = new Set<string>();
  const rows = await pool(urls, CONCURRENCY, async (url) => {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        return await source.scraper!.fetchDetail(url);
      } catch (err) {
        if (attempt === RETRIES) {
          failures.push(`${url}: ${(err as Error).message}`);
          failedUrls.add(url);
        } else await sleep(400 * attempt);
      }
    }
    return null;
  });
  const good = rows.filter((r): r is DisposalInsert => r !== null);
  if (good.length === 0) {
    return { error: `Scrape of ${source.label} produced no listings — kept existing data.` };
  }

  // Current book for this source — used to work out which refs disappeared.
  const { error: exError, data: existingRows } = await supabase
    .from("disposals")
    .select("id, source_ref, source_url")
    .eq("agency_id", agencyId)
    .eq("source", source.id);
  if (exError) return { error: exError.message };

  // Upsert on the (agency_id, source, source_ref) unique index (see
  // src/lib/disposals/import.ts) so existing row ids — and everything hanging
  // off them — are preserved. `source_ref` falls back to the listing URL so a
  // ref-less scrape can never dodge the conflict key, and `source_updated_at`
  // is stamped now() because the partner scrapers emit null.
  const nowIso = new Date().toISOString();
  const byRef = new Map(
    good.map((r) => [
      r.source_ref ?? r.source_url,
      {
        ...r,
        source_ref: r.source_ref ?? r.source_url,
        source_updated_at: r.source_updated_at ?? nowIso,
        agency_id: agencyId,
        listing_type: "intel",
        created_by: user.id,
      },
    ]),
  );
  const upsertRows = [...byRef.values()];
  const { error: upError } = await supabase
    .from("disposals")
    .upsert(upsertRows, { onConflict: "agency_id,source,source_ref" });
  if (upError) return { error: upError.message };

  // Listings gone from the partner's site: mark Withdrawn, never delete —
  // deals and send history keep pointing at a real row. Rows whose detail page
  // merely FAILED to scrape are left alone (absence isn't evidence there).
  const freshRefs = new Set(byRef.keys());
  const missingIds = (existingRows ?? [])
    .filter(
      (r) =>
        (r.source_ref == null || !freshRefs.has(r.source_ref)) &&
        !(r.source_url && failedUrls.has(r.source_url)),
    )
    .map((r) => r.id);
  let withdrawn = 0;
  if (missingIds.length > 0) {
    const { error: wError, count } = await supabase
      .from("disposals")
      .update({ status: "Withdrawn" }, { count: "exact" })
      .in("id", missingIds)
      .eq("agency_id", agencyId)
      .neq("status", "Withdrawn");
    if (!wError) withdrawn = count ?? 0;
  }

  // Best-effort geocode for rows still lacking coordinates (concurrency-capped;
  // geocodeAddress fails soft, so individual misses are simply skipped).
  const { data: toGeocode } = await supabase
    .from("disposals")
    .select("id, address_line, city, postcode")
    .eq("agency_id", agencyId)
    .eq("source", source.id)
    .is("lat", null);
  let geocoded = 0;
  if (toGeocode && toGeocode.length > 0) {
    await pool(toGeocode, GEOCODE_CONCURRENCY, async (row) => {
      const loc = await geocodeAddress(row);
      if (loc) {
        const { error } = await supabase
          .from("disposals")
          .update({ lat: loc.lat, lng: loc.lng })
          .eq("id", row.id)
          .eq("agency_id", agencyId);
        if (!error) geocoded++;
      }
      return null;
    });
  }

  // Score the freshly-synced stock against live briefs so new market intel
  // raises suggestions (and bell alerts) without anyone reopening /matches.
  const { data: syncedRows } = await supabase
    .from("disposals")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("source", source.id);
  await refreshMatchesForListings((syncedRows ?? []).map((r) => r.id));

  revalidatePath("/admin");
  revalidatePath("/listings");
  revalidatePath("/matches");
  return {
    message:
      `Synced ${upsertRows.length} ${source.label} listings.` +
      (withdrawn ? ` ${withdrawn} no longer listed — marked Withdrawn.` : "") +
      (geocoded ? ` ${geocoded} geocoded.` : "") +
      (failures.length ? ` ${failures.length} pages failed.` : ""),
  };
}

/** Remove every intel row for one partner source from the caller's agency. */
export async function deleteIntelSource(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await requireAdmin();
  if ("error" in gate) return { error: gate.error };
  const { supabase, agencyId } = gate;

  const sourceId = String(formData.get("source") ?? "");
  const source = intelSourceById.get(sourceId);
  if (!source) return { error: "Unknown Market Intel source." };

  const { error, count } = await supabase
    .from("disposals")
    .delete({ count: "exact" })
    .eq("agency_id", agencyId)
    .eq("source", source.id)
    .eq("listing_type", "intel");
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/listings");
  revalidatePath("/matches");
  return { message: `Deleted ${count ?? 0} ${source.label} listings.` };
}
