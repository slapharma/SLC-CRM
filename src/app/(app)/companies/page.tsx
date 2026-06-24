import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Companies"
        description="Operators, landlords, agents and vendors."
      />
      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="The Companies module ships in Phase 2 — records will list here with search and filtering."
      />
    </div>
  );
}
