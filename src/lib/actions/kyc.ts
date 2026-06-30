"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { runKycReport } from "@/lib/kyc/report";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullable = (fd: FormData, k: string) => str(fd, k) || null;

/** Run a KYC report for a company and store it. Used by the "Run report" button. */
export async function runKyc(
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

  const companyId = str(formData, "company_id");
  if (!companyId) return { error: "Pick a company first." };

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, company_number, vat_number")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return { error: "Company not found." };

  try {
    await runKycReport(company, supabase, agencyId, user.id);
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath("/kyc");
  revalidatePath(`/companies/${companyId}`);
  return { message: "KYC report generated." };
}

/** Save a company's registration number (CRN) + VAT number (from picker or manual). */
export async function linkCompanyNumber(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const id = str(formData, "company_id");
  if (!id) return { error: "Missing company id." };

  const company_number = nullable(formData, "company_number");
  const vat_number = nullable(formData, "vat_number");

  const { error } = await supabase
    .from("companies")
    .update({ company_number, vat_number })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/kyc");
  revalidatePath(`/companies/${id}`);
  return { message: "Saved registration details." };
}
