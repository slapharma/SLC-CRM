"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type CompanyType = Database["public"]["Enums"]["company_type"];
const TYPES: CompanyType[] = ["operator", "landlord", "agent", "vendor", "other"];

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullable = (fd: FormData, k: string) => str(fd, k) || null;
const tags = (fd: FormData, k: string) =>
  str(fd, k)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const asType = (v: string): CompanyType =>
  (TYPES as string[]).includes(v) ? (v as CompanyType) : "operator";

/** Lead agent + additional agents (de-duped, lead excluded from extras). */
const agents = (fd: FormData) => {
  const lead = nullable(fd, "lead_agent_id");
  const extra = Array.from(
    new Set(fd.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((id) => id !== lead);
  return { lead, extra };
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Replace a company's additional-agent rows. */
async function syncCompanyAgents(
  supabase: Supabase,
  companyId: string,
  agencyId: string,
  extra: string[],
) {
  await supabase.from("company_agents").delete().eq("company_id", companyId);
  if (extra.length > 0) {
    await supabase.from("company_agents").insert(
      extra.map((user_id) => ({
        agency_id: agencyId,
        company_id: companyId,
        user_id,
      })),
    );
  }
}

export async function createCompany(
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

  const name = str(formData, "name");
  if (!name) return { error: "Company name is required." };

  const { lead, extra } = agents(formData);
  const { data, error } = await supabase
    .from("companies")
    .insert({
      agency_id: agencyId,
      created_by: user.id,
      name,
      type: asType(str(formData, "type")),
      sector_tags: tags(formData, "sector_tags"),
      website: nullable(formData, "website"),
      phone: nullable(formData, "phone"),
      notes: nullable(formData, "notes"),
      lead_agent_id: lead,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await syncCompanyAgents(supabase, data.id, agencyId, extra);

  revalidatePath("/companies");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing company id." };

  const name = str(formData, "name");
  if (!name) return { error: "Company name is required." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const { lead, extra } = agents(formData);
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      type: asType(str(formData, "type")),
      sector_tags: tags(formData, "sector_tags"),
      website: nullable(formData, "website"),
      phone: nullable(formData, "phone"),
      notes: nullable(formData, "notes"),
      lead_agent_id: lead,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  await syncCompanyAgents(supabase, id, agencyId, extra);

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function deleteCompany(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("companies").delete().eq("id", id);
    revalidatePath("/companies");
  }
  redirect("/companies");
}
