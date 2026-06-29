import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealForm } from "@/components/deal-form";
import { dealStageBadge } from "@/lib/badges";
import { deleteDeal } from "@/lib/actions/deals";
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

  const [{ data: listing }, { data: requirement }, { data: company }] =
    await Promise.all([
      deal.listing_id
        ? supabase
            .from("disposals")
            .select("id, title, city")
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

  const sb = dealStageBadge(deal.stage);

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
            <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
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
        </div>
        <form action={deleteDeal} className="shrink-0">
          <input type="hidden" name="id" value={deal.id} />
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
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
