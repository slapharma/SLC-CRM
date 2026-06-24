"use server";

import { revalidatePath } from "next/cache";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import { importDisposalFromUrl, isCdgPropertyUrl, type DisposalImportState } from "./import";

const NOT_CONFIGURED =
  "Supabase isn't configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

/**
 * Server Action: import a CDG property URL into `disposals`.
 *
 * Next 16: Server Functions are reachable via direct POST, so we verify auth here
 * (not just in the UI). Writes run as the signed-in user — the table + Storage RLS
 * policies gate what they can do.
 */
export async function importDisposal(
  _prev: DisposalImportState,
  formData: FormData,
): Promise<DisposalImportState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };

  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Paste a CDG property URL." };
  if (!isCdgPropertyUrl(url)) {
    return { error: "Not a CDG Leisure property URL (cdgleisure.com/find-a-property/properties/…)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to import." };

  const { data: membership } = await supabase
    .from("agency_members")
    .select("agency_id")
    .limit(1)
    .maybeSingle();
  const agencyId = membership?.agency_id;
  if (!agencyId) return { error: "No agency is linked to your account." };

  try {
    const { id, rehost } = await importDisposalFromUrl(url, supabase, agencyId, {
      createdBy: user.id,
    });
    revalidatePath("/listings");
    const warnings = rehost?.failures.map((f) => `Media skipped: ${f.url} (${f.error})`);
    return {
      id,
      message: `Imported. ${rehost ? `${rehost.uploaded} image(s) re-hosted.` : ""}`.trim(),
      ...(warnings && warnings.length ? { warnings } : {}),
    };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
