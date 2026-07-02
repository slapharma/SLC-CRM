import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Store } from "lucide-react";

import { ConcentrationMap } from "@/components/concentration-map-lazy";
import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { FilterTiles } from "@/components/filter-tiles";
import { Heatmap } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { SortHeader } from "@/components/sort-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getMapLayers } from "@/lib/supabase/map-points";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listingStatusBadge, listingTypeBadge } from "@/lib/badges";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Listings" };

const fmtMoney = (v: number | null) =>
  v != null ? `£${Number(v).toLocaleString("en-GB")}` : "—";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    status?: string;
    disposal_type?: string;
    town?: string;
  }>;
}) {
  const { q, sort, dir, status, disposal_type, town } = await searchParams;
  const supabase = await createClient();

  const { column, ascending } = resolveSort(
    sort,
    dir,
    {
      title: "title",
      city: "city",
      use_class: "use_class",
      size_sqft: "size_sqft",
      rent_pa: "rent_pa",
      status: "status",
    },
    { column: "created_at", ascending: false },
  );

  let query = supabase
    .from("disposals")
    .select(
      "id, title, city, status, use_class, disposal_type, listing_type, size_sqft, rent_pa, premium",
    )
    .order(column, { ascending });
  if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%`);
  if (disposal_type) query = query.eq("disposal_type", disposal_type);
  const { data } = await query;
  const mapLayers = await getMapLayers(supabase);
  // `rows` is the heatmap base (q + type filtered). The town/status facets that
  // the heatmap controls are applied to the table in memory, so the grid keeps
  // showing the full distribution for re-slicing.
  const rows = data ?? [];
  const listRows = rows.filter(
    (r) =>
      (!town || (r.city ?? "—") === town) && (!status || (r.status ?? "—") === status),
  );

  const params = { q, sort, dir, status, disposal_type, town };

  // Stats bar: counts per status (whole q + type filtered set), click to facet.
  const STATUS_TILES = [
    { value: "Available", label: "Available" },
    { value: "Under Offer", label: "Under Offer" },
    { value: "Let", label: "Let" },
    { value: "Sold", label: "Sold" },
    { value: "Withdrawn", label: "Withdrawn" },
  ];
  const statusTiles = [
    { value: "", label: "All", count: rows.length },
    ...STATUS_TILES.map((t) => ({
      ...t,
      count: rows.filter((r) => (r.status ?? "") === t.value).length,
    })),
  ];

  // Heatmap: town × status — click a cell/label to filter the table below.
  const townCounts = new Map<string, number>();
  for (const r of rows) {
    const t = r.city ?? "—";
    townCounts.set(t, (townCounts.get(t) ?? 0) + 1);
  }
  const heatTowns = [...townCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);
  const statusCounts = new Map<string, number>();
  for (const r of rows) {
    const sName = r.status ?? "—";
    statusCounts.set(sName, (statusCounts.get(sName) ?? 0) + 1);
  }
  const heatStatuses = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((e) => e[0]);
  const heatMatrix = heatTowns.map((t) =>
    heatStatuses.map(
      (sName) =>
        rows.filter((r) => (r.city ?? "—") === t && (r.status ?? "—") === sName).length,
    ),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Listings"
        description="Leisure premises being marketed (disposals) — the supply side."
        action={
          <Link href="/listings/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New listing
          </Link>
        }
      />

      <FilterBar
        q={q}
        sort={sort}
        dir={dir}
        placeholder="Search by title or town…"
        basePath="/listings"
        hasActiveFilters={Boolean(status || disposal_type || town)}
      >
        <FilterSelect
          name="status"
          label="Status"
          value={status}
          options={[
            { value: "Available", label: "Available" },
            { value: "Under Offer", label: "Under Offer" },
            { value: "Let", label: "Let" },
            { value: "Sold", label: "Sold" },
            { value: "Withdrawn", label: "Withdrawn" },
          ]}
        />
        <FilterSelect
          name="disposal_type"
          label="Type"
          value={disposal_type}
          options={[
            { value: "freehold", label: "Freehold" },
            { value: "new_lease", label: "New lease" },
            { value: "lease_assignment", label: "Lease assignment" },
            { value: "sublease", label: "Sublease" },
            { value: "unknown", label: "Unspecified" },
          ]}
        />
      </FilterBar>

      {rows.length > 0 ? (
        <FilterTiles
          tiles={statusTiles}
          activeValue={status ?? ""}
          hrefFor={(v) => filterHref(params, { status: v === status ? null : v || null })}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Portfolio Spread — town × status</CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap
                compact
                rowLabels={heatTowns}
                colLabels={heatStatuses}
                matrix={heatMatrix}
                selectedRow={town}
                selectedCol={status}
                cellHref={(t, s) => filterHref(params, { town: t, status: s })}
                rowHref={(t) => filterHref(params, { town: t === town ? null : t })}
                colHref={(s) => filterHref(params, { status: s === status ? null : s })}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Location heat-map</CardTitle>
            </CardHeader>
            <CardContent>
              <ConcentrationMap layers={mapLayers} defaultActive="listing" compact />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {listRows.length === 0 ? (
        <EmptyState
          icon={Store}
          title={q || status || town || disposal_type ? "No matches" : "No listings yet"}
          description={
            q || status || town || disposal_type
              ? "Try a different search or filter."
              : "Click “New listing” to add your first premises."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="title" label="Title" params={params} />
              <SortHeader
                column="city"
                label="Town"
                params={params}
                className="hidden md:table-cell"
              />
              <SortHeader
                column="use_class"
                label="Use class"
                params={params}
                className="hidden md:table-cell"
              />
              <SortHeader
                column="size_sqft"
                label="Size (sq ft)"
                params={params}
                className="hidden text-right md:table-cell"
              />
              <SortHeader
                column="rent_pa"
                label="Rent / Premium"
                params={params}
                className="hidden text-right md:table-cell"
              />
              <SortHeader column="status" label="Status" params={params} />
              <TableHead className="w-10">
                <span className="sr-only">Edit</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listRows.map((d) => {
              const s = listingStatusBadge(d.status);
              const t = listingTypeBadge(d.listing_type);
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/listings/${d.id}`}
                        className="font-medium text-foreground hover:text-info hover:underline"
                      >
                        {d.title ?? "Untitled listing"}
                      </Link>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {d.city ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {d.use_class ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                    {d.size_sqft != null
                      ? Number(d.size_sqft).toLocaleString("en-GB")
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                    {d.rent_pa != null
                      ? `${fmtMoney(d.rent_pa)} pa`
                      : d.premium != null
                        ? fmtMoney(d.premium)
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/listings/${d.id}/edit`}
                      aria-label={`Edit ${d.title ?? "listing"}`}
                      className="inline-flex text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
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
