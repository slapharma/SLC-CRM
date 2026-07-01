"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type DealStage = Database["public"]["Enums"]["deal_stage"];
type ReqStatus = Database["public"]["Enums"]["requirement_status"];

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullableStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const asStage = (v: string): DealStage =>
  (Constants.public.Enums.deal_stage as readonly string[]).includes(v)
    ? (v as DealStage)
    : "lead";

/** Replace a deal's additional-agent collaborators (lead is dropped from the set). */
async function syncDealAgents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  dealId: string,
  lead: string | null,
  fd: FormData,
) {
  const extra = Array.from(
    new Set(fd.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((u) => u !== lead);
  await supabase
    .from("deal_agents")
    .delete()
    .eq("deal_id", dealId)
    .eq("agency_id", agencyId);
  if (extra.length > 0) {
    await supabase.from("deal_agents").insert(
      extra.map((user_id) => ({ agency_id: agencyId, deal_id: dealId, user_id })),
    );
  }
}

/**
 * Close the loop: when a deal reaches `completed`, mark its linked requirement
 * `satisfied` so it stops generating matches and leaves the active brief list.
 */
async function satisfyRequirementOnClose(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requirementId: string | null,
  stage: DealStage,
  agencyId: string,
) {
  if (stage !== "completed" || !requirementId) return;
  await supabase
    .from("requirements")
    .update({ status: "satisfied" as ReqStatus })
    .eq("id", requirementId)
    .eq("agency_id", agencyId);
}

/**
 * Create a deal from a requirement ↔ listing match. Derives the title, links
 * both records + the requirement's operator company, and seeds an indicative
 * value from the listing's guide price / premium / rent. Idempotent on the
 * (requirement, listing) pair so the same match can't spawn duplicate deals.
 */
export async function createDealFromMatch(formData: FormData): Promise<void> {
  const requirementId = str(formData, "requirement_id");
  const listingId = str(formData, "listing_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) redirect("/deals");

  // Reuse an existing deal for this pair rather than duplicating it.
  const { data: existing } = await supabase
    .from("deals")
    .select("id")
    .eq("requirement_id", requirementId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) redirect(`/deals/${existing.id}`);

  const [{ data: req }, { data: listing }] = await Promise.all([
    supabase
      .from("requirements")
      .select("title, company_id")
      .eq("id", requirementId)
      .maybeSingle(),
    supabase
      .from("disposals")
      .select("title, city, guide_price, premium, rent_pa")
      .eq("id", listingId)
      .maybeSingle(),
  ]);

  const listingName =
    listing?.title ?? (listing?.city ? `Listing · ${listing.city}` : "Listing");
  const reqName = req?.title ?? "Requirement";
  const value = listing?.guide_price ?? listing?.premium ?? listing?.rent_pa ?? null;
  // Use the name typed in the "name the deal" popup, else derive one.
  const title = str(formData, "title") || `${listingName} ↔ ${reqName}`;
  const lead = str(formData, "lead_agent_id") || null;

  const { data: row, error } = await supabase
    .from("deals")
    .insert({
      agency_id: agencyId,
      created_by: user.id,
      title,
      stage: "lead",
      requirement_id: requirementId || null,
      listing_id: listingId || null,
      company_id: req?.company_id ?? null,
      value,
      lead_agent_id: lead,
    })
    .select("id")
    .single();
  if (error) redirect("/deals");

  await syncDealAgents(supabase, agencyId, row.id, lead, formData);

  revalidatePath("/deals");
  redirect(`/deals/${row.id}`);
}

/**
 * Create a blank, named deal from the pipeline page's "New deal" popup. No
 * required links — the user names it and can wire up the listing/enquiry later.
 */
export async function createDeal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) redirect("/deals");

  const title = str(formData, "title") || "Untitled deal";
  const lead = str(formData, "lead_agent_id") || null;

  const { data: row, error } = await supabase
    .from("deals")
    .insert({
      agency_id: agencyId,
      created_by: user.id,
      title,
      stage: "lead",
      lead_agent_id: lead,
    })
    .select("id")
    .single();
  if (error) redirect("/deals");

  await syncDealAgents(supabase, agencyId, row.id, lead, formData);

  revalidatePath("/deals");
  redirect(`/deals/${row.id}`);
}

/** Move a deal to a new stage (board column control + detail-page stepper). */
export async function updateDealStage(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const stage = asStage(str(formData, "stage"));
  if (!id) return;

  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return;
  const { data: row, error } = await supabase
    .from("deals")
    .update({ stage })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("requirement_id")
    .maybeSingle();
  if (!error) {
    await satisfyRequirementOnClose(supabase, row?.requirement_id ?? null, stage, agencyId);
    revalidatePath("/deals");
    revalidatePath(`/deals/${id}`);
    if (stage === "completed") revalidatePath("/enquiries");
  }
}

/** Update a deal's editable fields from the detail-page form. */
export async function updateDeal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = str(formData, "id");
  if (!id) return { error: "Missing deal id." };

  const title = str(formData, "title");
  if (!title) return { error: "A deal title is required." };
  const stage = asStage(str(formData, "stage"));

  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };
  const lead = nullableStr(formData, "lead_agent_id");
  const { data: row, error } = await supabase
    .from("deals")
    .update({
      title,
      stage,
      value: num(formData, "value"),
      hot_terms: nullableStr(formData, "hot_terms"),
      notes: nullableStr(formData, "notes"),
      lead_agent_id: lead,
    })
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("requirement_id")
    .maybeSingle();
  if (error) return { error: error.message };

  await syncDealAgents(supabase, agencyId, id, lead, formData);
  await satisfyRequirementOnClose(supabase, row?.requirement_id ?? null, stage, agencyId);
  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  if (stage === "completed") revalidatePath("/enquiries");
  return { message: "Saved." };
}

export async function deleteDeal(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (id && agencyId) {
    await supabase
      .from("deals")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    revalidatePath("/deals");
  }
  redirect("/deals");
}
