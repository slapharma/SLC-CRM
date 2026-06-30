import { notFound } from "next/navigation";

import { DisposalForm } from "@/components/disposal-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateDisposal } from "@/lib/actions/disposals";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: disposal } = await supabase
    .from("disposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!disposal) notFound();

  const { data: agentRows } = await supabase
    .from("disposal_agents")
    .select("user_id")
    .eq("disposal_id", id);
  const agents = await getAgencyMembers(supabase, disposal.agency_id);
  const additionalAgentIds = (agentRows ?? []).map((r) => r.user_id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit listing" description={disposal.title ?? "Untitled listing"} />
      <Card>
        <CardContent className="pt-6">
          <DisposalForm
            action={updateDisposal}
            disposal={disposal}
            agents={agents}
            additionalAgentIds={additionalAgentIds}
          />
        </CardContent>
      </Card>
    </div>
  );
}
