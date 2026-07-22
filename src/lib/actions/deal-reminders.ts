"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Add a deadline / reminder to a deal (#11) and notify the deal owner. */
export async function addDealReminder(
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

  const dealId = str(formData, "deal_id");
  const title = str(formData, "title");
  const dueAt = str(formData, "due_at");
  if (!dealId) return { error: "Missing deal." };
  if (!title) return { error: "A reminder title is required." };
  if (!dueAt) return { error: "A due date is required." };

  const { error } = await supabase.from("deal_reminders").insert({
    agency_id: agencyId,
    deal_id: dealId,
    title,
    due_at: new Date(dueAt).toISOString(),
    created_by: user.id,
  });
  if (error) return { error: error.message };

  // Notify whoever owns the deal today — the lead agent, falling back to the
  // creator (if someone else set the reminder).
  const { data: deal } = await supabase
    .from("deals")
    .select("title, created_by, lead_agent_id")
    .eq("id", dealId)
    .maybeSingle();
  const owner = deal?.lead_agent_id ?? deal?.created_by ?? null;
  if (deal && owner && owner !== user.id) {
    await supabase.from("notifications").insert({
      agency_id: agencyId,
      user_id: owner,
      title: `Reminder set on “${deal.title}”`,
      body: `${title} — due ${new Date(dueAt).toLocaleString("en-GB")}`,
      link: `/deals/${dealId}`,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  return { message: "Reminder added." };
}

/**
 * Set a reminder's done state by explicit intent ("mark_done" / "mark_open").
 * The client submits the state it wants, not a negation of a possibly-stale
 * current value — so two people clicking "done" can't re-open it.
 */
export async function toggleDealReminder(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = str(formData, "id");
  const dealId = str(formData, "deal_id");
  const intent = str(formData, "intent");
  if (!id || !agencyId) return;
  if (intent !== "mark_done" && intent !== "mark_open") return;
  await supabase
    .from("deal_reminders")
    .update({ done: intent === "mark_done" })
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (dealId) revalidatePath(`/deals/${dealId}`);
}

/** Delete a reminder. */
export async function deleteDealReminder(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = str(formData, "id");
  const dealId = str(formData, "deal_id");
  if (!id || !agencyId) return;
  await supabase
    .from("deal_reminders")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (dealId) revalidatePath(`/deals/${dealId}`);
}

/**
 * Record that a deal update was shared (#11) and notify the deal owner. Called
 * from the client share buttons after they open the mail/WhatsApp composer.
 */
export async function logDealShare(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency." };

  const dealId = str(formData, "deal_id");
  const channel = str(formData, "channel");
  if (!dealId) return { error: "Missing deal." };

  await supabase.from("activities").insert({
    agency_id: agencyId,
    created_by: user.id,
    type: "note",
    subject: `Update shared via ${channel || "link"}`,
    entity_type: "deal",
    entity_id: dealId,
  });

  revalidatePath(`/deals/${dealId}`);
  return { message: "Logged." };
}
