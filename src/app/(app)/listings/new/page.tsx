import type { Metadata } from "next";

import { DisposalForm } from "@/components/disposal-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createDisposal } from "@/lib/actions/disposals";
import { currentAgencyId, getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const agents = agencyId ? await getAgencyMembers(supabase, agencyId) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New listing"
        description="Add a leisure premises to your supply book."
      />
      <Card>
        <CardContent className="pt-6">
          <DisposalForm action={createDisposal} agents={agents} />
        </CardContent>
      </Card>
    </div>
  );
}
