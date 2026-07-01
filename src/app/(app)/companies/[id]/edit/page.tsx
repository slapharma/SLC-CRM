import { notFound } from "next/navigation";

import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateCompany } from "@/lib/actions/companies";
import { getCompanyTypes } from "@/lib/company-types";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const [agents, { data: agentRows }, types] = await Promise.all([
    getAgencyMembers(supabase, company.agency_id),
    supabase.from("company_agents").select("user_id").eq("company_id", id),
    getCompanyTypes(),
  ]);
  const additionalAgentIds = (agentRows ?? []).map((r) => r.user_id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit company" description={company.name} />
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <CompanyForm
            action={updateCompany}
            company={company}
            agents={agents}
            additionalAgentIds={additionalAgentIds}
            types={types}
          />
        </CardContent>
      </Card>
    </div>
  );
}
