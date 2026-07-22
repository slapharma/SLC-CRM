import { notFound } from "next/navigation";

import { RequirementForm } from "@/components/requirement-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateRequirement } from "@/lib/actions/requirements";
import { getCompanyTypes } from "@/lib/company-types";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { getContactOptions } from "@/lib/supabase/pickers";
import { createClient } from "@/lib/supabase/server";

export default async function EditRequirementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: requirement }, { data: companies }] = await Promise.all([
    supabase.from("requirements").select("*").eq("id", id).maybeSingle(),
    supabase.from("companies").select("id, name").order("name"),
  ]);
  if (!requirement) notFound();

  const contacts = await getContactOptions(supabase, requirement.agency_id);
  const companyTypes = await getCompanyTypes();

  const { data: agentRows } = await supabase
    .from("requirement_agents")
    .select("user_id")
    .eq("requirement_id", id);
  const agents = await getAgencyMembers(supabase, requirement.agency_id);
  const additionalAgentIds = (agentRows ?? []).map((r) => r.user_id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit requirement" description={requirement.title} />
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <RequirementForm
            action={updateRequirement}
            requirement={requirement}
            companies={companies ?? []}
            contacts={contacts}
            companyTypes={companyTypes}
            agents={agents}
            additionalAgentIds={additionalAgentIds}
          />
        </CardContent>
      </Card>
    </div>
  );
}
