import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRoleBadge } from "@/lib/badges";
import { deleteContact } from "@/lib/actions/contacts";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();

  let companyName: string | null = null;
  if (contact.company_id) {
    const { data: c } = await supabase
      .from("companies")
      .select("name")
      .eq("id", contact.company_id)
      .maybeSingle();
    companyName = c?.name ?? null;
  }

  const r = contactRoleBadge(contact.role);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <Badge tone={r.tone}>{r.label}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            <Pencil />
            Edit
          </Link>
          <form action={deleteContact}>
            <input type="hidden" name="id" value={contact.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Company">
            {contact.company_id ? (
              <Link
                href={`/companies/${contact.company_id}`}
                className="text-info hover:underline"
              >
                {companyName ?? "View company"}
              </Link>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Email">
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-info hover:underline">
                {contact.email}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Phone">{contact.phone ?? "—"}</Row>
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{contact.notes ?? "—"}</span>
          </Row>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
