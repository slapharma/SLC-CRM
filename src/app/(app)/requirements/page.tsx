import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarPlus, Layers, Plus, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { FilterTiles } from "@/components/filter-tiles";
import { PageHeader } from "@/components/page-header";
import { SortHeader } from "@/components/sort-header";
import { StatsBar } from "@/components/stats-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { propertyUseBadge, requirementStatusBadge } from "@/lib/badges";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requirements" };

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; status?: string }>;
}) {
  const { q, sort, dir, status } = await searchParams;
  const supabase = await createClient();

  const { column, ascending } = resolveSort(
    sort,
    dir,
    { title: "title", max_rent: "max_rent", status: "status" },
    { column: "title", ascending: true },
  );

  let query = supabase
    .from("requirements")
    .select(
      "id, title, status, target_towns, max_rent, company_id, created_at, property_types, use_classes",
    )
    .order(column, { ascending });
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;
  // `rows` is the tile base (q filtered). The status facet is applied to the
  // table in memory so the tile counts always show the full distribution.
  const rows = data ?? [];
  const listRows = status ? rows.filter((r) => r.status === status) : rows;

  const params = { q, sort, dir, status };

  const STATUS_TILES = [
    { value: "active", label: "Active" },
    { value: "on_hold", label: "On hold" },
    { value: "satisfied", label: "Satisfied" },
    { value: "withdrawn", label: "Withdrawn" },
  ];
  const statusTiles = STATUS_TILES.map((s) => ({
    ...s,
    count: rows.filter((r) => r.status === s.value).length,
  }));

  // Key stats bar — a quick read on the requirement book.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const newThisMonth = rows.filter(
    (r) => new Date(r.created_at) >= startOfMonth,
  ).length;

  const countDistinct = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { distinct: counts.size, top: top?.[0] };
  };
  const propStats = countDistinct(rows.flatMap((r) => r.property_types ?? []));
  const useStats = countDistinct(rows.flatMap((r) => r.use_classes ?? []));

  const stats = [
    { label: "New this month", value: newThisMonth, icon: CalendarPlus },
    { label: "Total", value: rows.length, icon: Target },
    {
      label: "Property types",
      value: propStats.distinct,
      icon: Building2,
      hint: propStats.top ?? "—",
    },
    {
      label: "Use classes",
      value: useStats.distinct,
      icon: Layers,
      hint: useStats.top ? propertyUseBadge(useStats.top).label : "—",
    },
  ];

  const ids = [
    ...new Set(rows.map((r) => r.company_id).filter((v): v is string => Boolean(v))),
  ];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: comps } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", ids);
    (comps ?? []).forEach((c) => names.set(c.id, c.name));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Requirements"
        description="Operator requirements — the criteria matched against disposals."
        action={
          <Link href="/requirements/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New requirement
          </Link>
        }
      />

      <FilterBar
        q={q}
        sort={sort}
        dir={dir}
        placeholder="Search requirements…"
        basePath="/requirements"
        hasActiveFilters={Boolean(status)}
      >
        <FilterSelect
          name="status"
          label="Status"
          value={status}
          options={[
            { value: "active", label: "Active" },
            { value: "on_hold", label: "On hold" },
            { value: "satisfied", label: "Satisfied" },
            { value: "withdrawn", label: "Withdrawn" },
          ]}
        />
      </FilterBar>

      {rows.length > 0 ? (
        <FilterTiles
          tiles={statusTiles}
          activeValue={status}
          hrefFor={(v) => filterHref(params, { status: v === status ? null : v })}
        />
      ) : null}

      {rows.length > 0 ? <StatsBar stats={stats} className="mb-5" /> : null}

      {listRows.length > 0 && listRows.length < rows.length ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing {listRows.length} of {rows.length}
        </p>
      ) : null}

      {listRows.length === 0 ? (
        <EmptyState
          icon={Target}
          title={q || status ? "No matches" : "No requirements yet"}
          description={
            q || status
              ? "Try a different search or filter."
              : "Capture an operator's requirement to match against disposals."
          }
          action={
            q || status ? undefined : (
              <Link
                href="/requirements/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                New requirement
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="title" label="Title" params={params} />
              <TableHead className="hidden md:table-cell">Operator</TableHead>
              <TableHead className="hidden md:table-cell">Towns</TableHead>
              <SortHeader
                column="max_rent"
                label="Max rent"
                params={params}
                className="hidden md:table-cell"
              />
              <SortHeader column="status" label="Status" params={params} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listRows.map((r) => {
              const s = requirementStatusBadge(r.status);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/requirements/${r.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.company_id ? (names.get(r.company_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {r.target_towns.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="hidden font-mono tabular-nums text-muted-foreground md:table-cell">
                    {r.max_rent != null ? `£${r.max_rent.toLocaleString("en-GB")}` : "—"}
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
