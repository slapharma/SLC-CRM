import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DealStageSelect } from "@/components/deal-stage-select";
import { dealStageBadge } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";

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
  listing_id: string | null;
  requirement_id: string | null;
  company_id: string | null;
  listing: { title: string | null; city: string | null } | null;
  requirement: { title: string } | null;
  company: { name: string } | null;
};

export default async function DealsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      "id, title, stage, value, listing_id, requirement_id, company_id, listing:disposals(title, city), requirement:requirements(title), company:companies(name)",
    )
    .order("updated_at", { ascending: false });

  const deals = (data ?? []) as unknown as DealRow[];

  if (deals.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Deals"
          description="Listings + requirements + parties, through the pipeline to Heads of Terms."
        />
        <EmptyState
          icon={Handshake}
          title="No deals yet"
          description="Open a match on the Matches page (or a requirement/listing) and click “Create deal” to start the pipeline."
        />
      </div>
    );
  }

  const byStage = new Map<string, DealRow[]>();
  for (const s of STAGE_ORDER) byStage.set(s, []);
  for (const d of deals) (byStage.get(d.stage) ?? byStage.set(d.stage, []).get(d.stage)!).push(d);

  return (
    <div className="mx-auto max-w-[100rem]">
      <PageHeader
        title="Deals"
        description={`${deals.length} deal${deals.length === 1 ? "" : "s"} across the pipeline — move a card with its stage selector.`}
      />

      <div className="-mx-2 overflow-x-auto pb-4">
        <div className="flex min-w-max gap-3 px-2">
          {STAGE_ORDER.map((stage) => {
            const col = byStage.get(stage) ?? [];
            const sb = dealStageBadge(stage);
            return (
              <section
                key={stage}
                className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
                aria-label={`${sb.label} column`}
              >
                <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                  <Badge tone={sb.tone}>{sb.label}</Badge>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {col.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {col.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                      No deals
                    </p>
                  ) : (
                    col.map((d) => (
                      <article
                        key={d.id}
                        className="rounded-md border bg-card p-3 transition-colors hover:border-primary/40"
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
                        <div className="mt-2.5">
                          <DealStageSelect
                            id={d.id}
                            stage={d.stage}
                            className="h-8 text-xs"
                            aria-label={`Move “${d.title}” to another stage`}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
