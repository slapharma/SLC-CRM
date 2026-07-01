import type { Metadata } from "next";

import { RequirementForm } from "@/components/requirement-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createRequirement } from "@/lib/actions/requirements";
import { currentAgencyId, getAgencyMembers } from "@/lib/supabase/agency";
import { getContactOptions } from "@/lib/supabase/pickers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New requirement" };

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
  const contacts = agencyId ? await getContactOptions(supabase, agencyId) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New requirement"
        description="The operator requirement used to match against disposals."
      />
      <Card>
        <CardContent className="pt-6">
          <RequirementForm
            action={createRequirement}
            companies={companies ?? []}
            contacts={contacts}
            defaultCompanyId={company}
            agents={agents}
          />
        </CardContent>
      </Card>
    </div>
  );
}
