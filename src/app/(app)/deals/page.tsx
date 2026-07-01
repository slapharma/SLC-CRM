import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Handshake, Layers, PoundSterling } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatsBar } from "@/components/stats-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DealStageSelect } from "@/components/deal-stage-select";
import { NewDealButton } from "@/components/new-deal-button";
import { dealStageBadge } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Deals" };

const STAGE_ORDER = [
  "lead",
  "viewing",
  "offer",
  "heads_of_terms",
  "legal",
  "completed",
  "fell_through",
] as const;

const money = (v: number | null) =>
  v != null ? `£${v.toLocaleString("en-GB")}` : null;

type DealRow = {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  created_at: string;
  created_by: string | null;
  listing_id: string | null;
  requirement_id: string | null;
  company_id: string | null;
  listing: { title: string | null; city: string | null } | null;
  requirement: { title: string } | null;
  company: { name: string } | null;
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string }>;
}) {
  const { agent } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      "id, title, stage, value, created_at, created_by, listing_id, requirement_id, company_id, listing:disposals(title, city), requirement:requirements(title), company:companies(name)",
    )
    .order("updated_at", { ascending: false });

  const allDeals = (data ?? []) as unknown as DealRow[];

  const agentIds = [
    ...new Set(allDeals.map((d) => d.created_by).filter((v): v is string => Boolean(v))),
  ];
  const agentName = new Map<string, string>();
  if (agentIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", agentIds);
    (profs ?? []).forEach((p) =>
      agentName.set(p.id, p.full_name ?? p.email ?? "Agent"),
    );
  }

  if (allDeals.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Deals"
          description="Listings + requirements + parties, through the pipeline to Heads of Terms."
        />
        <EmptyState
          icon={Handshake}
          title="No deals yet"
          description="Open a match on the MatchMaker page (or a requirement/listing) and click “Create deal” to start the pipeline."
        />
      </div>
    );
  }

  const agentOptions = agentIds.map((id) => ({
    value: id,
    label: agentName.get(id) ?? "Agent",
  }));

  const deals = agent
    ? allDeals.filter((d) => d.created_by === agent)
    : allDeals;

  // Key pipeline stats (respect the agent filter).
  const CLOSED = new Set(["completed", "fell_through"]);
  const openDeals = deals.filter((d) => !CLOSED.has(d.stage));
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const wonCount = deals.filter((d) => d.stage === "completed").length;
  const stats = [
    { label: "Total deals", value: deals.length, icon: Handshake },
    { label: "Open", value: openDeals.length, icon: Layers },
    {
      label: "Pipeline value",
      value: money(pipelineValue) ?? "£0",
      icon: PoundSterling,
      hint: "open deals",
    },
    { label: "Won", value: wonCount, icon: CheckCircle2 },
  ];

  const byStage = new Map<string, DealRow[]>();
  for (const s of STAGE_ORDER) byStage.set(s, []);
  for (const d of deals) (byStage.get(d.stage) ?? byStage.set(d.stage, []).get(d.stage)!).push(d);

  return (
    <div className="mx-auto max-w-[100rem]">
      <PageHeader
        title="Deals"
        description={`${deals.length} deal${deals.length === 1 ? "" : "s"} across the pipeline — move a card with its stage selector.`}
        action={<NewDealButton />}
      />

      {agentOptions.length > 0 ? (
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Agent
            <select
              name="agent"
              defaultValue={agent ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All agents</option>
              {agentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Apply
          </button>
          {agent ? (
            <Link
              href="/deals"
              className="self-center text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </Link>
          ) : null}
        </form>
      ) : null}

      <StatsBar stats={stats} className="mb-6" />

      {deals.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
          No deals for this agent.
        </p>
      ) : (
        <div className="space-y-6">
          {STAGE_ORDER.map((stage) => {
            const col = byStage.get(stage) ?? [];
            if (col.length === 0) return null;
            const sb = dealStageBadge(stage);
            return (
              <section key={stage} aria-label={`${sb.label} stage`}>
                <div className="mb-2.5 flex items-center gap-2">
                  <Badge tone={sb.tone}>{sb.label}</Badge>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {col.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {col.map((d) => (
                    <article
                      key={d.id}
                      className="flex flex-col rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
                    >
                      <Link
                        href={`/deals/${d.id}`}
                        className="text-sm font-medium leading-snug text-foreground hover:text-info hover:underline"
                      >
                        {d.title}
                      </Link>
                      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {d.company?.name ? (
                          <div className="truncate">{d.company.name}</div>
                        ) : null}
                        {money(d.value) ? (
                          <div className="font-mono tabular-nums text-foreground">
                            {money(d.value)}
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString("en-GB")}
                          {d.created_by && agentName.get(d.created_by)
                            ? ` · ${agentName.get(d.created_by)}`
                            : ""}
                        </span>
                        <Link
                          href={`/deals/${d.id}`}
                          className={cn(
                            buttonVariants({ variant: "secondary", size: "sm" }),
                            "h-7 shrink-0 px-2 text-xs",
                          )}
                        >
                          View deal
                        </Link>
                      </div>
                      <div className="mt-2.5">
                        <DealStageSelect
                          id={d.id}
                          stage={d.stage}
                          className="h-8 text-xs"
                          aria-label={`Move “${d.title}” to another stage`}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
