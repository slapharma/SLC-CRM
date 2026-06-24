import type { Metadata } from "next";
import { Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Requirements" };

export default function RequirementsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Requirements"
        description="What operators want — towns, size, covers, budget and tenure."
      />
      <EmptyState
        icon={Target}
        title="No requirements yet"
        description="The Requirements module ships in Phase 4 — acquisition briefs will list here."
      />
    </div>
  );
}
