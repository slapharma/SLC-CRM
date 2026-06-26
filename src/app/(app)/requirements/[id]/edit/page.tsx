import { notFound } from "next/navigation";

import { RequirementForm } from "@/components/requirement-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateRequirement } from "@/lib/actions/requirements";
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit requirement" description={requirement.title} />
      <Card>
        <CardContent className="pt-6">
          <RequirementForm
            action={updateRequirement}
            requirement={requirement}
            companies={companies ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
