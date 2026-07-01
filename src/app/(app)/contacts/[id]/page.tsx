import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRoleBadge } from "@/lib/badges";
import { deleteContact } from "@/lib/actions/contacts";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { LocationMap } from "@/components/location-map";
import { SendToTeam } from "@/components/send-to-team";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: agentRows } = await supabase
    .from("contact_agents")
    .select("user_id")
    .eq("contact_id", id);
  const members = await getAgencyMembers(supabase, contact.agency_id);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const leadAgentName = contact.lead_agent_id
    ? (nameOf.get(contact.lead_agent_id) ?? "Unknown agent")
    : null;
  const additionalAgents = (agentRows ?? []).map((row) => ({
    id: row.user_id,
    name: nameOf.get(row.user_id) ?? "Unknown agent",
  }));

  const r = contactRoleBadge(contact.role);
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const address = [contact.address_line, contact.city, contact.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          <Badge tone={r.tone}>{r.label}</Badge>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <SendToTeam
            link={`/contacts/${contact.id}`}
            subject={name}
            agents={members}
            meId={user?.id}
          />
          <Link
            href={`/contacts/${contact.id}/edit`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            <Pencil />
            Edit
          </Link>
          <form action={deleteContact}>
            <input type="hidden" name="id" value={contact.id} />
            <ConfirmSubmitButton
              confirmMessage="Delete this contact? Their activity log and agent links will be removed and this can't be undone."
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </ConfirmSubmitButton>
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
          <Row label="Address">{address || "—"}</Row>
          <Row label="Lead agent">{leadAgentName ?? "—"}</Row>
          <Row label="Agents">
            {additionalAgents.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {additionalAgents.map((a) => (
                  <Badge key={a.id} tone="slate">
                    {a.name}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Notes">
            <span className="whitespace-pre-wrap">{contact.notes ?? "—"}</span>
          </Row>
        </CardContent>
      </Card>

      {contact.lat != null && contact.lng != null ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationMap lat={contact.lat} lng={contact.lng} label={name} />
          </CardContent>
        </Card>
      ) : null}
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
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
