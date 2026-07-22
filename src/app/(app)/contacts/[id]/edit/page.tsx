import { notFound } from "next/navigation";

import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateContact } from "@/lib/actions/contacts";
import { getCompanyTypes } from "@/lib/company-types";
import { getContactRoles } from "@/lib/contact-roles";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: contact }, { data: companies }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    supabase.from("companies").select("id, name").order("name"),
  ]);
  if (!contact) notFound();

  const [agents, { data: agentRows }, roles, companyTypes] = await Promise.all([
    getAgencyMembers(supabase, contact.agency_id),
    supabase.from("contact_agents").select("user_id").eq("contact_id", id),
    getContactRoles(),
    getCompanyTypes(),
  ]);
  const additionalAgentIds = (agentRows ?? []).map((r) => r.user_id);

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit contact" description={name} />
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <ContactForm
            action={updateContact}
            contact={contact}
            companies={companies ?? []}
            agents={agents}
            additionalAgentIds={additionalAgentIds}
            roles={roles}
            companyTypes={companyTypes}
          />
        </CardContent>
      </Card>
    </div>
  );
}
