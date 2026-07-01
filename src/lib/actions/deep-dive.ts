"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { getAgencyOpenRouter } from "@/lib/openrouter/config";
import { runDeepDiveReport } from "@/lib/deep-dive/report";
import type { FormState } from "@/lib/actions/types";

/** Run an AI Deep Dive research report for a company (#deep-dive). */
export async function runDeepDive(
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

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) return { error: "Missing company." };

  const cfg = await getAgencyOpenRouter(supabase);
  if (!cfg) {
    return { error: "Add an OpenRouter API key in Admin to enable Deep Dive." };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, sector_tags, website, address_line, city, postcode, company_number")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) return { error: "Company not found." };

  try {
    await runDeepDiveReport(
      {
        id: company.id,
        name: company.name,
        sector_tags: company.sector_tags,
        website: company.website,
        address: [company.address_line, company.city, company.postcode]
          .filter(Boolean)
          .join(", "),
        company_number: company.company_number,
      },
      supabase,
      agencyId,
      user.id,
      cfg,
    );
  } catch (err) {
    return { error: (err as Error).message };
  }

  revalidatePath(`/companies/${companyId}`);
  return { message: "Deep Dive complete." };
}
