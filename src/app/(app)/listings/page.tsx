import type { Metadata } from "next";
import Link from "next/link";
import { Search, Store } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ImportDisposalForm } from "@/components/import-disposal-form";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listingStatusBadge } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Listings" };

const fmtMoney = (v: number | null) =>
  v != null ? `£${Number(v).toLocaleString("en-GB")}` : "—";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("disposals")
    .select(
      "id, title, city, status, use_class, disposal_type, size_sqft, rent_pa, premium",
    )
    .order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%`);
  const { data } = await query;
  const rows = data ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Listings"
        description="Leisure premises being marketed (disposals) — the supply side."
      />

      <div className="mb-5 rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium">Import from CDG Leisure</p>
        <ImportDisposalForm />
      </div>

      <form className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Search by title or town…"
            aria-label="Search listings"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Store}
          title={q ? "No matches" : "No listings yet"}
          description={
            q
              ? "Try a different search term."
              : "Import a CDG property above, or listings will appear here once added."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Town</TableHead>
              <TableHead>Use class</TableHead>
              <TableHead className="text-right">Size (sq ft)</TableHead>
              <TableHead className="text-right">Rent / Premium</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const s = listingStatusBadge(d.status);
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/listings/${d.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {d.title ?? "Untitled listing"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.city ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.use_class ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {d.size_sqft != null
                      ? Number(d.size_sqft).toLocaleString("en-GB")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {d.rent_pa != null
                      ? `${fmtMoney(d.rent_pa)} pa`
                      : d.premium != null
                        ? fmtMoney(d.premium)
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
