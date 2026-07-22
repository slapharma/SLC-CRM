"use server";

import { revalidatePath } from "next/cache";

import type { DisposalInsert } from "@/lib/disposals/cdg";
import { intelSourceById, pool } from "@/lib/intel/sources";
import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const CONCURRENCY = 6;
const RETRIES = 2;

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
 * Re-scrape a partner source live and replace that source's intel rows for the
 * caller's agency. Existing rows are only deleted after the scrape succeeds,
 * so a partner-site outage never wipes current data.
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
  const rows = await pool(urls, CONCURRENCY, async (url) => {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        return await source.scraper!.fetchDetail(url);
      } catch (err) {
        if (attempt === RETRIES) failures.push(`${url}: ${(err as Error).message}`);
        else await sleep(400 * attempt);
      }
    }
    return null;
  });
  const good = rows.filter((r): r is DisposalInsert => r !== null);
  if (good.length === 0) {
    return { error: `Scrape of ${source.label} produced no listings — kept existing data.` };
  }

  // Replace this source's book (scrape succeeded, safe to swap).
  const { error: delError } = await supabase
    .from("disposals")
    .delete()
    .eq("agency_id", agencyId)
    .eq("source", source.id);
  if (delError) return { error: delError.message };

  const { error: insError } = await supabase.from("disposals").insert(
    good.map((r) => ({
      ...r,
      agency_id: agencyId,
      listing_type: "intel",
      created_by: user.id,
    })),
  );
  if (insError) return { error: insError.message };

  revalidatePath("/admin");
  revalidatePath("/listings");
  revalidatePath("/matches");
  return {
    message:
      `Synced ${good.length} ${source.label} listings.` +
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
