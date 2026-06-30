import type { Metadata } from "next";

import { RequirementForm } from "@/components/requirement-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createRequirement } from "@/lib/actions/requirements";
import { currentAgencyId, getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New enquiry" };

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");
  const agencyId = await currentAgencyId(supabase);
  const agents = agencyId ? await getAgencyMembers(supabase, agencyId) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New enquiry"
        description="The operator enquiry used to match against disposals."
      />
      <Card>
        <CardContent className="pt-6">
          <RequirementForm
            action={createRequirement}
            companies={companies ?? []}
            defaultCompanyId={company}
            agents={agents}
          />
        </CardContent>
      </Card>
    </div>
  );
}
