import type { Metadata } from "next";
import { Store } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Listings" };

export default function ListingsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Listings"
        description="Leisure premises being marketed — use class, licence, covers, tenure."
      />
      <EmptyState
        icon={Store}
        title="No listings yet"
        description="The Listings module ships in Phase 3 — units will list here with leisure-specific filters."
      />
    </div>
  );
}
