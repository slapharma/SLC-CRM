import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { createContact } from "@/lib/actions/contacts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New contact" };

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company } = await searchParams;
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New contact" description="Add a person and link them to a company." />
      <Card>
        <CardContent className="pt-6">
          <ContactForm
            action={createContact}
            companies={companies ?? []}
            defaultCompanyId={company}
          />
        </CardContent>
      </Card>
    </div>
  );
}
