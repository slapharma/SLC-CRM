import type { Metadata } from "next";

import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createCompany } from "@/lib/actions/companies";

export const metadata: Metadata = { title: "New company" };

export default function NewCompanyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New company"
        description="Add an operator, landlord, agent or vendor."
      />
      <Card>
        <CardContent className="pt-6">
          <CompanyForm action={createCompany} />
        </CardContent>
      </Card>
    </div>
  );
}
