import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createContact } from "@/lib/actions/contacts";
import { getContactRoles } from "@/lib/contact-roles";
import { currentAgencyId, getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const [{ data: companies }, agents, roles] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    agencyId ? getAgencyMembers(supabase, agencyId) : Promise.resolve([]),
    getContactRoles(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New contact" description="Add a person and link them to a company." />
      <Card>
        <CardContent className="pt-6">
          <ContactForm
            action={createContact}
            companies={companies ?? []}
            defaultCompanyId={company}
            agents={agents}
            roles={roles}
          />
        </CardContent>
      </Card>
    </div>
  );
}
