import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { CreateDealButton } from "@/components/create-deal-button";
import { EmptyState } from "@/components/empty-state";
import { MatchReasons } from "@/components/match-reasons";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { matchScoreBadge } from "@/lib/badges";
import { scoreMatch } from "@/lib/matching/score";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Matches" };

const THRESHOLD = 50;

export default async function MatchesPage() {
  const supabase = await createClient();
  const [{ data: reqs }, { data: disposals }] = await Promise.all([
    supabase.from("requirements").select("*").eq("status", "active"),
    supabase.from("disposals").select("*"),
  ]);
  const requirements = reqs ?? [];
  const supply = disposals ?? [];

  const pairs = requirements
    .flatMap((rq) => supply.map((d) => ({ rq, d, ...scoreMatch(rq, d) })))
    .filter((p) => p.score >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Matches"
        description={`Active requirement ↔ listing pairs scoring ${THRESHOLD}%+ across your agency.`}
      />

      {pairs.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No strong matches yet"
          description="Add active requirements and import listings — pairs scoring 50%+ surface here automatically."
        />
      ) : (
        <div className="space-y-3">
          {pairs.map(({ rq, d, score, reasons }) => {
            const ms = matchScoreBadge(score);
            return (
              <Card key={`${rq.id}-${d.id}`}>
                <CardContent className="p-4">
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
