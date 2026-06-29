import { notFound } from "next/navigation";

import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { updateContact } from "@/lib/actions/contacts";
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

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit contact" description={name} />
      <Card>
        <CardContent className="pt-6">
          <ContactForm
            action={updateContact}
            contact={contact}
            companies={companies ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
