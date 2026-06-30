"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type MemberRole = Database["public"]["Enums"]["member_role"];

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const asRole = (v: string): MemberRole =>
  v === "admin" ? "admin" : v === "manager" ? "manager" : "agent";

/** Create a new agent in the caller's agency (admin only — enforced in the RPC). */
export async function createAgent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const email = str(formData, "email");
  const password = str(formData, "password");
  if (!email) return { error: "Email is required." };
  if (!password) return { error: "Password is required." };

  const { error } = await supabase.rpc("admin_create_agent", {
    p_agency_id: agencyId,
    p_email: email,
    p_password: password,
    p_full_name: str(formData, "full_name"),
    p_role: asRole(str(formData, "role")),
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { message: `Added ${email}.` };
}

/** Edit an agent's details: name, email, phone, photo (admin only — RPC-enforced). */
export async function updateAgent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const userId = str(formData, "user_id");
  const email = str(formData, "email");
  if (!userId) return { error: "Missing user." };
  if (!email) return { error: "Email is required." };

  const { error } = await supabase.rpc("admin_update_agent", {
    p_agency_id: agencyId,
    p_user_id: userId,
    p_email: email,
    p_full_name: str(formData, "full_name"),
    p_phone: str(formData, "phone"),
    p_avatar_url: str(formData, "avatar_url"),
    p_linkedin_url: str(formData, "linkedin_url"),
    p_x_url: str(formData, "x_url"),
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { message: "Saved." };
}

/** Reset an agent's password (admin only — enforced in the RPC). */
export async function setAgentPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const userId = str(formData, "user_id");
  const password = str(formData, "password");
  if (!userId) return { error: "Missing user." };
  if (!password) return { error: "Password is required." };

  const { error } = await supabase.rpc("admin_set_agent_password", {
    p_agency_id: agencyId,
    p_user_id: userId,
    p_password: password,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { message: "Password updated." };
}

/** Change a member's role. RLS (members_update) restricts this to agency admins. */
export async function updateAgentRole(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const userId = str(formData, "user_id");
  if (!agencyId || !userId) return;
  await supabase
    .from("agency_members")
    .update({ role: asRole(str(formData, "role")) })
    .eq("agency_id", agencyId)
    .eq("user_id", userId);
  revalidatePath("/admin");
}

/** Remove a member from the agency. RLS (members_delete) restricts this to admins. */
export async function removeAgent(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const userId = str(formData, "user_id");
  if (!agencyId || !userId) return;
  await supabase
    .from("agency_members")
    .delete()
    .eq("agency_id", agencyId)
    .eq("user_id", userId);
  revalidatePath("/admin");
}
