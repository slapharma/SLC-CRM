"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type UseClass = Database["public"]["Enums"]["use_class"];
type Tenure = Database["public"]["Enums"]["tenure_type"];
type ReqStatus = Database["public"]["Enums"]["requirement_status"];

const FIT_OUTS = ["fully_fitted", "part_fitted", "shell"] as const;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullableStr = (fd: FormData, k: string) => str(fd, k) || null;
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const commaArr = (fd: FormData, k: string) =>
  str(fd, k)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const pickEnum = <T extends string>(
  fd: FormData,
  k: string,
  allowed: readonly T[],
): T[] =>
  fd
    .getAll(k)
    .map(String)
    .filter((v): v is T => (allowed as readonly string[]).includes(v));

function payload(fd: FormData) {
  const status = str(fd, "status");
  return {
    title: str(fd, "title"),
    company_id: nullableStr(fd, "company_id"),
    status: (
      (Constants.public.Enums.requirement_status as readonly string[]).includes(status)
        ? status
        : "active"
    ) as ReqStatus,
    target_towns: commaArr(fd, "target_towns"),
    target_regions: commaArr(fd, "target_regions"),
    property_types: commaArr(fd, "property_types"),
    use_classes: pickEnum<UseClass>(fd, "use_classes", Constants.public.Enums.use_class),
    tenure_prefs: pickEnum<Tenure>(fd, "tenure_prefs", Constants.public.Enums.tenure_type),
    fit_out_prefs: pickEnum(fd, "fit_out_prefs", FIT_OUTS),
    min_sqft: num(fd, "min_sqft"),
    max_sqft: num(fd, "max_sqft"),
    min_covers: num(fd, "min_covers"),
    max_covers: num(fd, "max_covers"),
    max_rent: num(fd, "max_rent"),
    max_premium: num(fd, "max_premium"),
    max_guide_price: num(fd, "max_guide_price"),
    notes: nullableStr(fd, "notes"),
    lead_agent_id: nullableStr(fd, "lead_agent_id"),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Lead agent + additional agents (de-duped, lead excluded from extras). */
const agents = (fd: FormData) => {
  const lead = nullableStr(fd, "lead_agent_id");
  const extra = Array.from(
    new Set(fd.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((id) => id !== lead);
  return { lead, extra };
};

/** Replace an enquiry's additional-agent rows. */
async function syncRequirementAgents(
  supabase: Supabase,
  requirementId: string,
  agencyId: string,
  extra: string[],
) {
  await supabase
    .from("requirement_agents")
    .delete()
    .eq("requirement_id", requirementId)
    .eq("agency_id", agencyId);
  if (extra.length > 0) {
    await supabase.from("requirement_agents").insert(
      extra.map((user_id) => ({
        agency_id: agencyId,
        requirement_id: requirementId,
        user_id,
      })),
    );
  }
}

export async function createRequirement(
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

  const data = payload(formData);
  if (!data.title) return { error: "A requirement title is required." };

  const { data: row, error } = await supabase
    .from("requirements")
    .insert({ agency_id: agencyId, created_by: user.id, ...data })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await syncRequirementAgents(supabase, row.id, agencyId, agents(formData).extra);

  revalidatePath("/enquiries");
  redirect(`/enquiries/${row.id}`);
}

export async function updateRequirement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing requirement id." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const data = payload(formData);
  if (!data.title) return { error: "A requirement title is required." };

  const { error } = await supabase
    .from("requirements")
    .update(data)
    .eq("id", id)
    .eq("agency_id", agencyId);
  if (error) return { error: error.message };

  await syncRequirementAgents(supabase, id, agencyId, agents(formData).extra);

  revalidatePath("/enquiries");
  revalidatePath(`/enquiries/${id}`);
  redirect(`/enquiries/${id}`);
}

export async function deleteRequirement(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = String(formData.get("id") ?? "");
  if (id && agencyId) {
    await supabase
      .from("requirements")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);
    revalidatePath("/enquiries");
  }
  redirect("/enquiries");
}
