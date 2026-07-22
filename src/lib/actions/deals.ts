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
 * Best-effort stage-history entry (deal_stage_events). Written on creation
 * (from_stage null) and on every stage change — never fails the calling
 * action if the insert errors.
 */
async function recordStageEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  dealId: string,
  fromStage: DealStage | null,
  toStage: DealStage,
  changedBy: string | null,
) {
  const { error } = await supabase.from("deal_stage_events").insert({
    agency_id: agencyId,
    deal_id: dealId,
    from_stage: fromStage,
    to_stage: toStage,
    changed_by: changedBy,
  });
  if (error) {
    console.error(`deal_stage_events insert failed for deal ${dealId}:`, error.message);
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
 * Mirror of satisfyRequirementOnClose: when a deal LEAVES `completed` (it was
 * un-closed or moved to fell_through), put the linked requirement back in play
 * — but only if it is still `satisfied` (don't stomp a manual withdraw/hold).
 */
async function reactivateRequirementOnReopen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requirementId: string | null,
  fromStage: DealStage,
  toStage: DealStage,
  agencyId: string,
) {
  if (fromStage !== "completed" || toStage === "completed" || !requirementId) return;
  await supabase
    .from("requirements")
    .update({ status: "active" as ReqStatus })
    .eq("id", requirementId)
    .eq("agency_id", agencyId)
    .eq("status", "satisfied" as ReqStatus);
}

/**
 * Keep the linked listing's status in step with the deal stage — forward-only,
 * never downgrading a status by hand:
 *   offer / heads_of_terms : Available → Under Offer
 *   completed              : Available / Under Offer → Let (to_let) or Sold (for_sale)
 */
async function syncListingStatusForStage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  listingId: string | null,
  stage: DealStage,
) {
  if (!listingId) return;
  if (stage !== "offer" && stage !== "heads_of_terms" && stage !== "completed") return;

  const { data: listing } = await supabase
    .from("disposals")
    .select("id, status, to_let, for_sale")
    .eq("id", listingId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!listing) return;

  const current = (listing.status ?? "").trim().toLowerCase();
  let next: string | null = null;
  if (stage === "completed") {
    if (current === "available" || current === "under offer") {
      next = listing.to_let ? "Let" : listing.for_sale ? "Sold" : "Let";
    }
  } else if (current === "available") {
    next = "Under Offer";
  }
  if (!next) return;

  await supabase
    .from("disposals")
    .update({ status: next })
    .eq("id", listingId)
    .eq("agency_id", agencyId);
  revalidatePath("/listings");
  revalidatePath(`/listings/${listingId}`);
}

/**
 * Tell the new lead agent they own the deal now (skipped when they made the
 * change themselves). Mirrors the reminder-notification pattern.
 */
async function notifyLeadAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  dealId: string,
  dealTitle: string,
  leadId: string | null,
  actorId: string | null,
) {
  if (!leadId || leadId === actorId) return;
  await supabase.from("notifications").insert({
    agency_id: agencyId,
    user_id: leadId,
    title: `You are now lead agent on “${dealTitle}”`,
    body: "You've been assigned as the lead agent for this deal.",
    link: `/deals/${dealId}`,
  });
}

/**
 * Create a deal from a requirement ↔ listing match. Derives the title, links
 * both records + the requirement's operator company, and seeds an indicative
 * value from the listing's guide price / premium / rent. Idempotent on the
 * (requirement, listing) pair so the same match can't spawn duplicate deals.
 */
export async function createDealFromMatch(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requirementId = str(formData, "requirement_id");
  const listingId = str(formData, "listing_id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  // Reuse an existing deal for this pair rather than duplicating it. A title
  // typed into the modal isn't thrown away — it renames the deal we land on,
  // so the user's input still means something.
  const { data: existing } = await supabase
    .from("deals")
    .select("id, title")
    .eq("agency_id", agencyId)
    .eq("requirement_id", requirementId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing) {
    const typed = str(formData, "title");
    const renamed = Boolean(typed) && typed !== existing.title;
    if (renamed) {
      await supabase
        .from("deals")
        .update({ title: typed })
        .eq("id", existing.id)
        .eq("agency_id", agencyId);
      revalidatePath(`/deals/${existing.id}`);
      revalidatePath("/deals");
    }
    redirect(`/deals/${existing.id}?existing=1${renamed ? "&renamed=1" : ""}`);
  }

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
  if (error) return { error: `Could not create the deal: ${error.message}` };

  await recordStageEvent(supabase, agencyId, row.id, null, "lead", user.id);
  await syncDealAgents(supabase, agencyId, row.id, lead, formData);
  await notifyLeadAssignment(supabase, agencyId, row.id, title, lead, user.id);

  revalidatePath("/deals");
  redirect(`/deals/${row.id}`);
}

/**
 * Create a blank, named deal from the pipeline page's "New deal" popup. No
 * required links — the user names it and can wire up the listing/requirement later.
 */
export async function createDeal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

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
  if (error) return { error: `Could not create the deal: ${error.message}` };

  await recordStageEvent(supabase, agencyId, row.id, null, "lead", user.id);
  await syncDealAgents(supabase, agencyId, row.id, lead, formData);
  await notifyLeadAssignment(supabase, agencyId, row.id, title, lead, user.id);

  revalidatePath("/deals");
  redirect(`/deals/${row.id}`);
}

/** Move a deal to a new stage (board column control + detail-page stepper). */
export async function updateDealStage(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const stage = asStage(str(formData, "stage"));
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return;

  const { data: before } = await supabase
    .from("deals")
    .select("stage, requirement_id, listing_id")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!before) return;

  const { error } = await supabase
    .from("deals")
    .update({ stage })
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (error) return;

  if (before.stage !== stage) {
    await recordStageEvent(supabase, agencyId, id, before.stage, stage, user?.id ?? null);
    await satisfyRequirementOnClose(supabase, before.requirement_id, stage, agencyId);
    await reactivateRequirementOnReopen(
      supabase,
      before.requirement_id,
      before.stage,
      stage,
      agencyId,
    );
    await syncListingStatusForStage(supabase, agencyId, before.listing_id, stage);
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  if (stage === "completed" || before.stage === "completed") {
    revalidatePath("/requirements");
  }
}

/** Rename a deal — the inline pencil-icon editor used wherever a deal's title
 * is shown (board cards, detail header, linked-deal sections). */
export async function updateDealTitle(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = str(formData, "id");
  if (!id) return { error: "Missing deal id." };

  const title = str(formData, "title");
  if (!title) return { error: "A deal title is required." };

  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const { error } = await supabase
    .from("deals")
    .update({ title })
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (error) return { error: error.message };

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return { message: "Saved." };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };
  const lead = nullableStr(formData, "lead_agent_id");

  const { data: before } = await supabase
    .from("deals")
    .select("stage, lead_agent_id, requirement_id, listing_id")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!before) return { error: "Deal not found." };

  const { error } = await supabase
    .from("deals")
    .update({
      title,
      stage,
      value: num(formData, "value"),
      hot_terms: nullableStr(formData, "hot_terms"),
      notes: nullableStr(formData, "notes"),
      lead_agent_id: lead,
      expected_close: nullableStr(formData, "expected_close"),
    })
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (error) return { error: error.message };

  await syncDealAgents(supabase, agencyId, id, lead, formData);

  if (before.stage !== stage) {
    await recordStageEvent(supabase, agencyId, id, before.stage, stage, user?.id ?? null);
    await satisfyRequirementOnClose(supabase, before.requirement_id, stage, agencyId);
    await reactivateRequirementOnReopen(
      supabase,
      before.requirement_id,
      before.stage,
      stage,
      agencyId,
    );
    await syncListingStatusForStage(supabase, agencyId, before.listing_id, stage);
  }

  // Tell the new lead they own this deal now (unless they assigned themselves).
  if (lead && lead !== before.lead_agent_id) {
    await notifyLeadAssignment(supabase, agencyId, id, title, lead, user?.id ?? null);
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  if (stage === "completed" || before.stage === "completed") {
    revalidatePath("/requirements");
  }
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
