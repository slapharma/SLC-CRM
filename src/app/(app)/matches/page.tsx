import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Matches"
        description="Scored supply↔demand candidates with the reasons behind each match."
      />
      <EmptyState
        icon={Sparkles}
        title="No matches yet"
        description="The matching engine ships in Phase 5 — scored listing/requirement pairs will surface here."
      />
    </div>
  );
}
