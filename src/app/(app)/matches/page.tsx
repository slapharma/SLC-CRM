import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, Sparkles, Store, Target } from "lucide-react";

import { CreateDealButton } from "@/components/create-deal-button";
import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { MatchReasons } from "@/components/match-reasons";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LocationFlexSlider } from "@/components/location-flex-slider";
import { isListingMatchable, matchScoreBadge } from "@/lib/badges";
import { DEFAULT_LOCATION_FLEX, scoreMatch } from "@/lib/matching/score";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "MatchMaker Opportunities" };

// Score-tier accent (left border + chip fill), keyed off the same tones
// matchScoreBadge already uses — no new colours, just a bolder application.
const SCORE_ACCENT: Record<string, { border: string; chip: string }> = {
  emerald: {
    border: "border-l-emerald-500 dark:border-l-emerald-600",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  teal: {
    border: "border-l-teal-500 dark:border-l-teal-600",
    chip: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  amber: {
    border: "border-l-amber-500 dark:border-l-amber-600",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  slate: {
    border: "border-l-slate-300 dark:border-l-slate-700",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  },
};

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
  searchParams: Promise<{ q?: string; min?: string; use_class?: string; flex?: string }>;
}) {
  const { q, min, use_class, flex } = await searchParams;
  const minScore = Math.min(95, Math.max(0, Number(min ?? "50") || 50));
  const flexParsed = Number(flex ?? DEFAULT_LOCATION_FLEX);
  const locationFlex = Math.min(
    100,
    Math.max(0, Number.isFinite(flexParsed) ? flexParsed : DEFAULT_LOCATION_FLEX),
  );

  const supabase = await createClient();
  const [{ data: reqs }, { data: disposals }] = await Promise.all([
    supabase
      .from("requirements")
      .select(
        "id, title, target_towns, target_regions, target_counties, target_postcode_districts, min_sqft, max_sqft, min_covers, max_covers, use_classes, property_types, tenure_prefs, max_rent, max_premium, max_guide_price, fit_out_prefs",
      )
      .eq("status", "active"),
    supabase
      .from("disposals")
      .select(
        "id, title, status, city, area, postcode, address_line, county, lat, lng, size_sqft, covers_internal, use_class, property_type, disposal_type, rent_pa, premium, guide_price, fit_out_state",
      ),
  ]);
  const requirements = reqs ?? [];
  // Only pitch live stock — never surface let/sold/withdrawn listings as matches.
  const supply = (disposals ?? []).filter((d) => isListingMatchable(d.status));

  const term = (q ?? "").trim().toLowerCase();
  let pairs = requirements
    .flatMap((rq) => supply.map((d) => ({ rq, d, ...scoreMatch(rq, d, { locationFlex }) })))
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
        hasActiveFilters={
          Boolean(use_class) ||
          (min != null && min !== "50") ||
          locationFlex !== DEFAULT_LOCATION_FLEX
        }
      >
        <LocationFlexSlider defaultValue={locationFlex} />
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
            const accent = SCORE_ACCENT[ms.tone] ?? SCORE_ACCENT.slate;
            return (
              <Card
                key={`${rq.id}-${d.id}`}
                className={cn("overflow-hidden border-l-4", accent.border)}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:p-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg",
                      accent.chip,
                    )}
                  >
                    <span className="font-mono text-lg font-bold leading-none tabular-nums">
                      {score}%
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
                      match
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Link
                            href={`/requirements/${rq.id}`}
                            className="font-medium text-foreground hover:text-info hover:underline"
                          >
                            {rq.title}
                          </Link>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Link
                            href={`/listings/${d.id}`}
                            className="font-medium text-foreground hover:text-info hover:underline"
                          >
                            {d.title ?? "Untitled listing"}
                            {d.city ? ` · ${d.city}` : ""}
                          </Link>
                        </p>
                      </div>
                      <CreateDealButton requirementId={rq.id} listingId={d.id} />
                    </div>
                    <div className="border-t pt-2">
                      <MatchReasons reasons={reasons} />
                    </div>
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
