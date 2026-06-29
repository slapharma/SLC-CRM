import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listingStatusBadge, matchScoreBadge } from "@/lib/badges";
import { deleteDisposal } from "@/lib/actions/disposals";
import { scoreMatch } from "@/lib/matching/score";
import { MatchReasons } from "@/components/match-reasons";
import { DisposalAssignmentForm } from "@/components/disposal-assignment-form";
import { getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const money = (v: number | null) =>
  v != null ? `£${Number(v).toLocaleString("en-GB")}` : "—";

const DISPOSAL_TYPE_LABELS: Record<string, string> = {
  freehold: "Freehold",
  new_lease: "New lease",
  lease_assignment: "Lease assignment",
  sublease: "Sublease",
  unknown: "Unspecified",
};
const FIT_OUT_LABELS: Record<string, string> = {
  fully_fitted: "Fully fitted",
  part_fitted: "Part fitted",
  shell: "Shell",
};

type ImageItem = { url: string; alt?: string | null };
type SectionItem = { title: string; content: string };

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: d } = await supabase
    .from("disposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const s = listingStatusBadge(d.status);
  const images = (Array.isArray(d.images) ? d.images : []) as ImageItem[];
  const sections = (Array.isArray(d.sections) ? d.sections : []) as SectionItem[];
  const location = [d.address_line, d.city, d.postcode].filter(Boolean).join(", ");

  const { data: reqs } = await supabase.from("requirements").select("*");
  const matches = (reqs ?? [])
    .map((rq) => ({ rq, ...scoreMatch(rq, d) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const { data: agentRows } = await supabase
    .from("disposal_agents")
    .select("user_id")
    .eq("disposal_id", id);
  const agents = await getAgencyMembers(supabase, d.agency_id);
  const additionalAgentIds = (agentRows ?? []).map((r) => r.user_id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {d.title ?? "Untitled listing"}
            </h1>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
          {location ? (
            <p className="mt-1 text-sm text-muted-foreground">{location}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/listings/${d.id}/particulars`}
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <FileDown />
            Download PDF
          </a>
          {d.source_url ? (
            <a
              href={d.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              <ExternalLink />
              Source
            </a>
          ) : null}
          <form action={deleteDisposal}>
            <input type="hidden" name="id" value={d.id} />
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

      {images.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.slice(0, 6).map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.url}
              alt={img.alt ?? d.title ?? "Listing image"}
              className="h-32 w-full rounded-md border object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Premises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Type">
              {DISPOSAL_TYPE_LABELS[d.disposal_type] ?? d.disposal_type}
              {d.to_let ? " · To let" : ""}
              {d.for_sale ? " · For sale" : ""}
            </Row>
            <Row label="Use class">{d.use_class ?? "—"}</Row>
            <Row label="Property">{d.property_type ?? "—"}</Row>
            <Row label="Size">
              {d.size_sqft != null
                ? `${Number(d.size_sqft).toLocaleString("en-GB")} sq ft`
                : "—"}
              {d.size_sqm != null
                ? ` (${Number(d.size_sqm).toLocaleString("en-GB")} sq m)`
                : ""}
            </Row>
            <Row label="Covers">
              {d.covers_internal != null ? `${d.covers_internal} internal` : "—"}
              {d.covers_external != null ? ` + ${d.covers_external} external` : ""}
            </Row>
            <Row label="Fit-out">
              {d.fit_out_state
                ? (FIT_OUT_LABELS[d.fit_out_state] ?? d.fit_out_state)
                : "—"}
            </Row>
            <Row label="EPC">{d.epc_rating ?? "—"}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commercials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Rent">
              <span className="font-mono tabular-nums">{money(d.rent_pa)}</span>
              {d.rent_pa != null ? " pa" : ""}
            </Row>
            <Row label="Premium">
              <span className="font-mono tabular-nums">{money(d.premium)}</span>
            </Row>
            <Row label="Guide price">
              <span className="font-mono tabular-nums">{money(d.guide_price)}</span>
            </Row>
            <Row label="Rateable">
              <span className="font-mono tabular-nums">{money(d.rateable_value)}</span>
            </Row>
            <Row label="Service charge">
              <span className="font-mono tabular-nums">{money(d.service_charge)}</span>
            </Row>
            <Row label="Tenure">{d.tenure_raw ?? "—"}</Row>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Matching requirements</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No operator requirements match this listing yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map(({ rq, score, reasons }) => {
                const ms = matchScoreBadge(score);
                return (
                  <li key={rq.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/requirements/${rq.id}`}
                        className="font-medium text-foreground hover:text-info hover:underline"
                      >
                        {rq.title}
                      </Link>
                      <Badge tone={ms.tone}>{ms.label}</Badge>
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <DisposalAssignmentForm
            disposalId={d.id}
            agents={agents}
            leadAgentId={d.lead_agent_id}
            additionalAgentIds={additionalAgentIds}
          />
        </CardContent>
      </Card>

      {d.agent_name || d.agent_email || d.agent_phone ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Agent (from source)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {d.agent_name ? <p className="font-medium">{d.agent_name}</p> : null}
            {d.agent_email ? (
              <p>
                <a
                  href={`mailto:${d.agent_email}`}
                  className="text-info hover:underline"
                >
                  {d.agent_email}
                </a>
              </p>
            ) : null}
            {d.agent_phone ? (
              <p className="text-muted-foreground">{d.agent_phone}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {d.description ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {d.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {sections.length > 0 ? (
        <div className="mt-4 space-y-4">
          {sections.map((sec, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>{sec.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {sec.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {d.brochure_url ? (
        <p className="mt-4 text-sm">
          <a
            href={d.brochure_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info hover:underline"
          >
            Download brochure →
          </a>
        </p>
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
