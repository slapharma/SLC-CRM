import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, Sparkles, Store, Target } from "lucide-react";

import { CreateDealButton } from "@/components/create-deal-button";
import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { MatchReasons } from "@/components/match-reasons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { isListingMatchable, matchScoreBadge } from "@/lib/badges";
import { scoreMatch } from "@/lib/matching/score";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "MatchMaker Opportunities" };

const USE_CLASS_OPTIONS = [
  { value: "E", label: "Class E" },
  { value: "sui_generis_pub_bar", label: "Pub / Bar" },
  { value: "sui_generis_nightclub", label: "Nightclub" },
  { value: "sui_generis_hot_food", label: "Hot-food takeaway" },
  { value: "A3", label: "A3" },
  { value: "A4", label: "A4" },
  { value: "A5", label: "A5" },
  { value: "other", label: "Other" },
];

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; min?: string; use_class?: string }>;
}) {
  const { q, min, use_class } = await searchParams;
  const minScore = Math.min(95, Math.max(0, Number(min ?? "50") || 50));

  const supabase = await createClient();
  const [{ data: reqs }, { data: disposals }] = await Promise.all([
    supabase.from("requirements").select("*").eq("status", "active"),
    supabase.from("disposals").select("*"),
  ]);
  const requirements = reqs ?? [];
  // Only pitch live stock — never surface let/sold/withdrawn listings as matches.
  const supply = (disposals ?? []).filter((d) => isListingMatchable(d.status));

  const term = (q ?? "").trim().toLowerCase();
  let pairs = requirements
    .flatMap((rq) => supply.map((d) => ({ rq, d, ...scoreMatch(rq, d) })))
    .filter((p) => p.score >= minScore);
  if (term) {
    pairs = pairs.filter(
      (p) =>
        (p.d.city ?? "").toLowerCase().includes(term) ||
        (p.d.title ?? "").toLowerCase().includes(term) ||
        p.rq.title.toLowerCase().includes(term) ||
        p.rq.target_towns.some((t) => t.toLowerCase().includes(term)),
    );
  }
  if (use_class) {
    pairs = pairs.filter((p) => p.rq.use_classes.includes(use_class as never));
  }
  pairs.sort((a, b) => b.score - a.score);

  const avgScore = pairs.length
    ? Math.round(pairs.reduce((s, p) => s + p.score, 0) / pairs.length)
    : 0;
  const shown = pairs.slice(0, 50);

  const stats = [
    { label: "Active requirements", value: requirements.length, icon: Target },
    { label: "Live listings", value: supply.length, icon: Store },
    { label: "Opportunities", value: pairs.length, icon: Sparkles },
    { label: "Avg score", value: `${avgScore}%`, icon: Gauge },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="MatchMaker Opportunities"
        description={`Active requirement ↔ listing pairs scoring ${minScore}%+ across your agency.`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-4 sm:p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <FilterBar
        q={q}
        placeholder="Filter by town or name…"
        basePath="/matches"
        hasActiveFilters={Boolean(use_class) || (min != null && min !== "50")}
      >
        <FilterSelect
          name="min"
          label="Min score"
          value={min}
          options={[
            { value: "50", label: "50%+" },
            { value: "60", label: "60%+" },
            { value: "70", label: "70%+" },
            { value: "80", label: "80%+" },
          ]}
        />
        <FilterSelect
          name="use_class"
          label="Use class"
          value={use_class}
          options={USE_CLASS_OPTIONS}
        />
      </FilterBar>

      {shown.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No strong opportunities yet"
          description="Adjust the filters above, or add active requirements and listings — pairs surface here automatically."
        />
      ) : (
        <div className="space-y-3">
          {shown.map(({ rq, d, score, reasons }) => {
            const ms = matchScoreBadge(score);
            return (
              <Card key={`${rq.id}-${d.id}`}>
                <CardContent className="p-4 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <Link
                        href={`/requirements/${rq.id}`}
                        className="font-medium text-foreground hover:text-info hover:underline"
                      >
                        {rq.title}
                      </Link>
                      <span className="text-muted-foreground"> ↔ </span>
                      <Link
                        href={`/listings/${d.id}`}
                        className="font-medium text-foreground hover:text-info hover:underline"
                      >
                        {d.title ?? "Untitled listing"}
                        {d.city ? ` · ${d.city}` : ""}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={ms.tone}>{ms.label}</Badge>
                      <CreateDealButton requirementId={rq.id} listingId={d.id} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <MatchReasons reasons={reasons} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
