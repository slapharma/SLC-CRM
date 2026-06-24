import type { Metadata } from "next";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contacts"
        description="People linked to companies — acquisitions, landlords, solicitors."
      />
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="The Contacts module ships in Phase 2 — people will list here, linked to their company."
      />
    </div>
  );
}
