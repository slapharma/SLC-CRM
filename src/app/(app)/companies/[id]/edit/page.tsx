import { notFound } from "next/navigation";

import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateCompany } from "@/lib/actions/companies";
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit company" description={company.name} />
      <Card>
        <CardContent className="pt-6">
          <CompanyForm action={updateCompany} company={company} />
        </CardContent>
      </Card>
    </div>
  );
}
