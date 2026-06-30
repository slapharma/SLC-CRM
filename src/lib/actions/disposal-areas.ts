"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[, ]/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Add a row to a listing's available-area schedule (#10). */
export async function addDisposalArea(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const disposalId = str(formData, "disposal_id");
  const name = str(formData, "name");
  if (!disposalId) return { error: "Missing listing." };
  if (!name) return { error: "A floor / unit name is required." };

  const { error } = await supabase.from("disposal_areas").insert({
    agency_id: agencyId,
    disposal_id: disposalId,
    name,
    size_sqft: numOrNull(formData, "size_sqft"),
    size_sqm: numOrNull(formData, "size_sqm"),
    rent_pa: numOrNull(formData, "rent_pa"),
    availability: str(formData, "availability") || null,
    sort_order: numOrNull(formData, "sort_order") ?? 0,
  });
  if (error) return { error: error.message };

  revalidatePath(`/listings/${disposalId}`);
  return { message: "Area added." };
}

/** Delete a row from the available-area schedule. */
export async function deleteDisposalArea(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = str(formData, "id");
  const disposalId = str(formData, "disposal_id");
  if (!id) return;
  await supabase.from("disposal_areas").delete().eq("id", id);
  if (disposalId) revalidatePath(`/listings/${disposalId}`);
}
