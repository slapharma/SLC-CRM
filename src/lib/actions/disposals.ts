"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

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
