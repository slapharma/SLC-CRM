import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Deals"
        description="Listings + requirements + parties, through the pipeline to Heads of Terms."
      />
      <EmptyState
        icon={Handshake}
        title="No deals yet"
        description="The Deal pipeline ships in a later phase — stages and Heads of Terms will live here."
      />
    </div>
  );
}
