import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { FilterTiles } from "@/components/filter-tiles";
import { PageHeader } from "@/components/page-header";
import { SortHeader } from "@/components/sort-header";
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
import { requirementStatusBadge } from "@/lib/badges";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Enquiries" };

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
    .select("id, title, status, target_towns, max_rent, company_id")
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
        title="Enquiries"
        description="Operator enquiries — the criteria matched against disposals."
        action={
          <Link href="/enquiries/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New enquiry
          </Link>
        }
      />

      <FilterBar
        q={q}
        sort={sort}
        dir={dir}
        placeholder="Search enquiries…"
        basePath="/enquiries"
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

      {listRows.length === 0 ? (
        <EmptyState
          icon={Target}
          title={q || status ? "No matches" : "No enquiries yet"}
          description={
            q || status
              ? "Try a different search or filter."
              : "Capture an operator's enquiry to match against disposals."
          }
          action={
            q || status ? undefined : (
              <Link
                href="/enquiries/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                New enquiry
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="title" label="Title" params={params} />
              <TableHead>Operator</TableHead>
              <TableHead>Towns</TableHead>
              <SortHeader column="max_rent" label="Max rent" params={params} />
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
                      href={`/enquiries/${r.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.company_id ? (names.get(r.company_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.target_towns.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground">
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
