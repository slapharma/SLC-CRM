import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isListingMatchable,
  matchScoreBadge,
  requirementStatusBadge,
  tenureBadge,
  propertyUseBadge,
} from "@/lib/badges";
import { deleteRequirement } from "@/lib/actions/requirements";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { scoreMatch } from "@/lib/matching/score";
import { CreateDealButton } from "@/components/create-deal-button";
import { MatchReasons } from "@/components/match-reasons";
import { SendToTeam } from "@/components/send-to-team";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const FIT_OUT_LABELS: Record<string, string> = {
  fully_fitted: "Fully fitted",
  part_fitted: "Part fitted",
  shell: "Shell",
};

function band(min: number | null, max: number | null, unit = "") {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${min.toLocaleString("en-GB")}–${max.toLocaleString("en-GB")}${unit}`;
  if (min != null) return `${min.toLocaleString("en-GB")}${unit}+`;
  return `up to ${max!.toLocaleString("en-GB")}${unit}`;
}
const money = (v: number | null) => (v != null ? `£${v.toLocaleString("en-GB")}` : "—");

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: r } = await supabase
    .from("requirements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  let companyName: string | null = null;
  if (r.company_id) {
    const { data: c } = await supabase
      .from("companies")
      .select("name")
      .eq("id", r.company_id)
      .maybeSingle();
    companyName = c?.name ?? null;
  }

  const s = requirementStatusBadge(r.status);

  const { data: agentRows } = await supabase
    .from("requirement_agents")
    .select("user_id")
    .eq("requirement_id", id);
  const members = await getAgencyMembers(supabase, r.agency_id);
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const leadAgentName = r.lead_agent_id
    ? (nameOf.get(r.lead_agent_id) ?? "Unknown agent")
    : null;
  const additionalAgents = (agentRows ?? []).map((row) => ({
    id: row.user_id,
    name: nameOf.get(row.user_id) ?? "Unknown agent",
  }));

  const { data: disposals } = await supabase.from("disposals").select("*");
  const matches = (disposals ?? [])
    .filter((d) => isListingMatchable(d.status))
    .map((d) => ({ d, ...scoreMatch(r, d) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
          {r.company_id ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Operator:{" "}
              <Link
                href={`/companies/${r.company_id}`}
                className="text-info hover:underline"
              >
                {companyName ?? "View company"}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <SendToTeam
            link={`/enquiries/${r.id}`}
            subject={r.title}
            agents={members}
            meId={user?.id}
          />
          <Link
            href={`/enquiries/${r.id}/edit`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            <Pencil />
            Edit
          </Link>
          <form action={deleteRequirement}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmitButton
              confirmMessage="Delete this enquiry? Its matches and agent links will be removed and this can't be undone."
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Towns">{r.target_towns.join(", ") || "—"}</Row>
            <Row label="Regions">{r.target_regions.join(", ") || "—"}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Types">{r.property_types.join(", ") || "—"}</Row>
            <Row label="Use class">
              <BadgeList items={r.use_classes.map((u) => propertyUseBadge(u))} />
            </Row>
            <Row label="Size">{band(r.min_sqft, r.max_sqft, " sq ft")}</Row>
            <Row label="Covers">{band(r.min_covers, r.max_covers)}</Row>
            <Row label="Fit-out">
              {r.fit_out_prefs.length
                ? r.fit_out_prefs.map((f) => FIT_OUT_LABELS[f] ?? f).join(", ")
                : "—"}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Structure &amp; budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Tenure">
              <BadgeList items={r.tenure_prefs.map((t) => tenureBadge(t))} />
            </Row>
            <Row label="Max rent">
              <span className="font-mono tabular-nums">{money(r.max_rent)}</span>
              {r.max_rent != null ? (
                <span className="text-muted-foreground"> pa</span>
              ) : null}
            </Row>
            <Row label="Max premium">
              <span className="font-mono tabular-nums">{money(r.max_premium)}</span>
            </Row>
            <Row label="Max guide">
              <span className="font-mono tabular-nums">
                {money(r.max_guide_price)}
              </span>
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="whitespace-pre-wrap text-foreground">{r.notes ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
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
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>MatchMaker Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No MatchMaker opportunities yet — add disposals to generate matches.
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map(({ d, score, reasons }) => {
                const ms = matchScoreBadge(score);
                return (
                  <li key={d.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/listings/${d.id}`}
                        className="font-medium text-foreground hover:text-info hover:underline"
                      >
                        {d.title ?? "Untitled listing"}
                        {d.city ? ` · ${d.city}` : ""}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge tone={ms.tone}>{ms.label}</Badge>
                        <CreateDealButton requirementId={r.id} listingId={d.id} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <MatchReasons reasons={reasons} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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

function BadgeList({
  items,
}: {
  items: { tone: React.ComponentProps<typeof Badge>["tone"]; label: string }[];
}) {
  if (items.length === 0) return <>—</>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <Badge key={i} tone={it.tone}>
          {it.label}
        </Badge>
      ))}
    </span>
  );
}
