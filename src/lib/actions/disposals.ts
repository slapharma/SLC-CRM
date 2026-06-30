"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { geocodeForSave } from "@/lib/maps/geocode";
import type { TablesInsert } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[, ]/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const boolOf = (fd: FormData, k: string) => fd.get(k) != null;
const textOrNull = (fd: FormData, k: string) => str(fd, k) || null;

const DISPOSAL_TYPES = ["freehold", "new_lease", "lease_assignment", "sublease", "unknown"];
const FIT_OUT_STATES = ["fully_fitted", "part_fitted", "shell"];

/** Map the disposal form fields onto an insert/update payload (shared by create + edit). */
function disposalFieldsFromForm(fd: FormData): Omit<TablesInsert<"disposals">, "agency_id"> {
  const disposalType = str(fd, "disposal_type");
  const fitOut = str(fd, "fit_out_state");
  const features = str(fd, "key_features")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: str(fd, "title") || "Untitled listing",
    status: textOrNull(fd, "status"),
    disposal_type: DISPOSAL_TYPES.includes(disposalType)
      ? (disposalType as TablesInsert<"disposals">["disposal_type"])
      : "unknown",
    to_let: boolOf(fd, "to_let"),
    for_sale: boolOf(fd, "for_sale"),
    address_line: textOrNull(fd, "address_line"),
    area: textOrNull(fd, "area"),
    city: textOrNull(fd, "city"),
    postcode: textOrNull(fd, "postcode"),
    property_type: textOrNull(fd, "property_type"),
    use_class: textOrNull(fd, "use_class"),
    size_sqft: numOrNull(fd, "size_sqft"),
    size_sqm: numOrNull(fd, "size_sqm"),
    covers_internal: numOrNull(fd, "covers_internal"),
    covers_external: numOrNull(fd, "covers_external"),
    fit_out_state: FIT_OUT_STATES.includes(fitOut) ? fitOut : null,
    epc_rating: textOrNull(fd, "epc_rating"),
    tenure_raw: textOrNull(fd, "tenure_raw"),
    rent_pa: numOrNull(fd, "rent_pa"),
    premium: numOrNull(fd, "premium"),
    guide_price: numOrNull(fd, "guide_price"),
    rateable_value: numOrNull(fd, "rateable_value"),
    service_charge: numOrNull(fd, "service_charge"),
    key_features: features,
    description: textOrNull(fd, "description"),
    lead_agent_id: textOrNull(fd, "lead_agent_id"),
  };
}

/** Replace a disposal's additional-agent collaborators (lead is dropped from the set). */
async function syncDisposalAgents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  disposalId: string,
  lead: string | null,
  fd: FormData,
) {
  const extra = Array.from(
    new Set(fd.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((u) => u !== lead);
  await supabase.from("disposal_agents").delete().eq("disposal_id", disposalId);
  if (extra.length > 0) {
    await supabase.from("disposal_agents").insert(
      extra.map((user_id) => ({ agency_id: agencyId, disposal_id: disposalId, user_id })),
    );
  }
}

/** Create a manually-entered listing (#15). */
export async function createDisposal(
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

  if (!str(formData, "title")) return { error: "Title is required." };

  const fields = disposalFieldsFromForm(formData);
  // Geocode the address → lat/lng (no-op when no address or no server key).
  const geo = await geocodeForSave(fields);
  const { data, error } = await supabase
    .from("disposals")
    .insert({
      ...fields,
      ...(geo ?? {}),
      agency_id: agencyId,
      source: "manual",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create the listing." };

  await syncDisposalAgents(supabase, agencyId, data.id, fields.lead_agent_id ?? null, formData);

  revalidatePath("/listings");
  redirect(`/listings/${data.id}`);
}

/** Update an existing listing (#1). */
export async function updateDisposal(
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

  const id = str(formData, "id");
  if (!id) return { error: "Missing listing id." };
  if (!str(formData, "title")) return { error: "Title is required." };

  const fields = disposalFieldsFromForm(formData);
  // Re-geocode only when the address changed or coords are missing.
  const { data: existing } = await supabase
    .from("disposals")
    .select("address_line, city, postcode, lat, lng")
    .eq("id", id)
    .maybeSingle();
  const geo = await geocodeForSave(fields, existing);
  const { error } = await supabase
    .from("disposals")
    .update({ ...fields, ...(geo ?? {}) })
    .eq("id", id);
  if (error) return { error: error.message };

  await syncDisposalAgents(supabase, agencyId, id, fields.lead_agent_id ?? null, formData);

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  redirect(`/listings/${id}`);
}

/** Delete a disposal (RLS ensures it's the caller's agency). */
export async function deleteDisposal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("disposals").delete().eq("id", id);
    revalidatePath("/listings");
  }
  redirect("/listings");
}

/** Set a disposal's lead agent + additional agents. */
export async function updateDisposalAssignment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing disposal id." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const lead = String(formData.get("lead_agent_id") ?? "").trim() || null;
  const extra = Array.from(
    new Set(formData.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((u) => u !== lead);

  const { error } = await supabase
    .from("disposals")
    .update({ lead_agent_id: lead })
    .eq("id", id);
  if (error) return { error: error.message };

  await supabase.from("disposal_agents").delete().eq("disposal_id", id);
  if (extra.length > 0) {
    await supabase.from("disposal_agents").insert(
      extra.map((user_id) => ({ agency_id: agencyId, disposal_id: id, user_id })),
    );
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  return { message: "Assignment saved." };
}
