import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactRoleBadge } from "@/lib/badges";
import { getContactRoles, roleLabel } from "@/lib/contact-roles";
import { deleteContact } from "@/lib/actions/contacts";
import { ActivityTimeline } from "@/components/activity-timeline";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { LocationMap } from "@/components/location-map";
import { LogActivityForm } from "@/components/log-activity-form";
import { SendToTeam } from "@/components/send-to-team";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("first_name, last_name")
    .eq("id", id)
    .maybeSingle();
  const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ");
  return { title: name || "Contact" };
}

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

  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, subject, body, occurred_at, created_by")
    .eq("entity_type", "contact")
    .eq("entity_id", id)
    .order("occurred_at", { ascending: false })
    .limit(20);
  const members = await getAgencyMembers(supabase, contact.agency_id);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const leadAgentName = contact.lead_agent_id
    ? (nameOf.get(contact.lead_agent_id) ?? "Unknown agent")
    : null;
  const additionalAgents = (agentRows ?? []).map((row) => ({
    id: row.user_id,
    name: nameOf.get(row.user_id) ?? "Unknown agent",
  }));

  const roles = await getContactRoles();
  const r = contactRoleBadge(contact.role, roleLabel(roles, contact.role));
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
              confirmMessage="Delete this contact? Their activity history and agent links will be removed, any linked listings or requirements will lose this contact, and this can't be undone."
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
          <Row label="Marketing">
            <Badge tone={contact.marketing_opt_in ? "emerald" : "slate"}>
              {contact.marketing_opt_in ? "Yes" : "No"}
            </Badge>
          </Row>
          {/* KYC runs against the company, so this only appears once the
              contact is linked to one. */}
          {contact.company_id ? (
            <Row label="KYC">
              <Link
                href={`/kyc?company=${contact.company_id}`}
                className="text-info hover:underline"
              >
                Run KYC report on {companyName ?? "their company"}
              </Link>
            </Row>
          ) : null}
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <LogActivityForm entityType="contact" entityId={contact.id} />
          <ActivityTimeline
            activities={activities ?? []}
            actorNames={Object.fromEntries(nameOf)}
          />
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
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
