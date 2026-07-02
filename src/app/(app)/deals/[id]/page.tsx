import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EditableDealTitle } from "@/components/editable-deal-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealForm } from "@/components/deal-form";
import { DealReminders } from "@/components/deal-reminders";
import { DealShareActions } from "@/components/deal-share-actions";
import { ActivityTimeline } from "@/components/activity-timeline";
import { LogActivityForm } from "@/components/log-activity-form";
import { SendToTeam } from "@/components/send-to-team";
import { dealStageBadge } from "@/lib/badges";
import { deleteDeal } from "@/lib/actions/deals";
import { isPast } from "@/lib/time";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!deal) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const members = await getAgencyMembers(supabase, deal.agency_id);

  const [{ data: listing }, { data: requirement }, { data: company }] =
    await Promise.all([
      deal.listing_id
        ? supabase
            .from("disposals")
            .select("id, title, city, company_id, contact_id")
            .eq("id", deal.listing_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      deal.requirement_id
        ? supabase
            .from("requirements")
            .select("id, title")
            .eq("id", deal.requirement_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      deal.company_id
        ? supabase
            .from("companies")
            .select("id, name")
            .eq("id", deal.company_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  // #6: pull the listing's own linked company + point-of-contact so the deal
  // shows every party's details with links.
  const [{ data: listingCompany }, { data: listingContact }] = await Promise.all([
    listing?.company_id
      ? supabase
          .from("companies")
          .select("id, name")
          .eq("id", listing.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    listing?.contact_id
      ? supabase
          .from("contacts")
          .select("id, first_name, last_name, email, phone")
          .eq("id", listing.contact_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Deal lead + additional agents (for the assignment fields + summary).
  const { data: dealAgentRows } = await supabase
    .from("deal_agents")
    .select("user_id")
    .eq("deal_id", id);
  const additionalAgentIds = (dealAgentRows ?? []).map((r) => r.user_id);

  const sb = dealStageBadge(deal.stage);

  let ownerName: string | null = null;
  if (deal.created_by) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", deal.created_by)
      .maybeSingle();
    ownerName = prof?.full_name ?? prof?.email ?? null;
  }

  const { data: reminderRows } = await supabase
    .from("deal_reminders")
    .select("id, title, due_at, done")
    .eq("deal_id", id)
    .order("due_at");
  const reminders = (reminderRows ?? []).map((r) => ({
    ...r,
    overdue: isPast(r.due_at),
  }));

  const { data: activities } = await supabase
    .from("activities")
    .select("id, type, subject, body, occurred_at")
    .eq("entity_type", "deal")
    .eq("entity_id", id)
    .order("occurred_at", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/deals"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              <EditableDealTitle dealId={deal.id} title={deal.title} />
            </h1>
            <Badge tone={sb.tone}>{sb.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {deal.value != null ? (
              <span className="font-mono tabular-nums text-foreground">
                £{deal.value.toLocaleString("en-GB")}
              </span>
            ) : (
              "No value set"
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Created {new Date(deal.created_at).toLocaleDateString("en-GB")}
            {ownerName ? ` · ${ownerName}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <SendToTeam
            link={`/deals/${deal.id}`}
            subject={deal.title}
            agents={members}
            meId={user?.id}
          />
          <DealShareActions
            dealId={deal.id}
            title={deal.title}
            stage={sb.label}
            value={deal.value}
          />
          <form action={deleteDeal}>
            <input type="hidden" name="id" value={deal.id} />
            <ConfirmSubmitButton
              confirmMessage="Delete this deal? Its reminders and activity will be removed and this can't be undone."
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Listing
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {listing ? (
              <Link
                href={`/listings/${listing.id}`}
                className="font-medium text-foreground hover:text-info hover:underline"
              >
                {listing.title ?? "Untitled listing"}
                {listing.city ? ` · ${listing.city}` : ""}
              </Link>
            ) : (
              <span className="text-muted-foreground">Not linked</span>
            )}
            {company ? (
              <p className="mt-1 text-muted-foreground">
                Operator:{" "}
                <Link
                  href={`/companies/${company.id}`}
                  className="text-info hover:underline"
                >
                  {company.name}
                </Link>
              </p>
            ) : null}
            {listingCompany ? (
              <p className="mt-1 text-muted-foreground">
                Listing company:{" "}
                <Link
                  href={`/companies/${listingCompany.id}`}
                  className="text-info hover:underline"
                >
                  {listingCompany.name}
                </Link>
              </p>
            ) : null}
            {listingContact ? (
              <p className="mt-1 text-muted-foreground">
                Contact:{" "}
                <Link
                  href={`/contacts/${listingContact.id}`}
                  className="text-info hover:underline"
                >
                  {[listingContact.first_name, listingContact.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unnamed contact"}
                </Link>
                {listingContact.email ? (
                  <>
                    {" · "}
                    <a
                      href={`mailto:${listingContact.email}`}
                      className="text-info hover:underline"
                    >
                      {listingContact.email}
                    </a>
                  </>
                ) : null}
                {listingContact.phone ? ` · ${listingContact.phone}` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Requirement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {requirement ? (
              <Link
                href={`/requirements/${requirement.id}`}
                className="font-medium text-foreground hover:text-info hover:underline"
              >
                {requirement.title}
              </Link>
            ) : (
              <span className="text-muted-foreground">Not linked</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deal details</CardTitle>
        </CardHeader>
        <CardContent>
          <DealForm
            deal={{
              id: deal.id,
              title: deal.title,
              stage: deal.stage,
              value: deal.value,
              hot_terms: deal.hot_terms,
              notes: deal.notes,
              lead_agent_id: deal.lead_agent_id,
            }}
            agents={members}
            additionalAgentIds={additionalAgentIds}
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Reminders &amp; deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <DealReminders dealId={deal.id} reminders={reminders} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Updates &amp; notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <LogActivityForm entityType="deal" entityId={deal.id} />
          <ActivityTimeline activities={activities ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
