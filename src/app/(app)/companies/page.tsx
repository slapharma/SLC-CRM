import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { Heatmap } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { SortHeader } from "@/components/sort-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { companyTypeBadge } from "@/lib/badges";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    type?: string;
    tag?: string;
  }>;
}) {
  const { q, sort, dir, type, tag } = await searchParams;
  const supabase = await createClient();

  const { column, ascending } = resolveSort(
    sort,
    dir,
    { name: "name", type: "type" },
    { column: "name", ascending: true },
  );

  let query = supabase
    .from("companies")
    .select("id, name, type, sector_tags, website")
    .order(column, { ascending });
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  // `rows` is the heatmap base (q filtered). The tag/type facets that the
  // heatmap controls are applied to the table in memory so the grid keeps the
  // full distribution.
  const rows = data ?? [];
  const listRows = rows.filter(
    (c) => (!type || c.type === type) && (!tag || c.sector_tags.includes(tag)),
  );

  const params = { q, sort, dir, type, tag };

  // Heatmap: sector tag × company type — click a cell/label to filter below.
  const tagCounts = new Map<string, number>();
  for (const c of rows) for (const t of c.sector_tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const heatTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);
  const heatTypes = [
    { value: "operator", label: "Operator" },
    { value: "landlord", label: "Landlord" },
    { value: "agent", label: "Agent" },
    { value: "vendor", label: "Vendor" },
    { value: "other", label: "Other" },
  ];
  const heatMatrix = heatTags.map((tag) =>
    heatTypes.map(
      (ty) => rows.filter((c) => c.type === ty.value && c.sector_tags.includes(tag)).length,
    ),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Companies"
        description="Operators, landlords, agents and vendors."
        action={
          <Link href="/companies/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New company
          </Link>
        }
      />

      <FilterBar
        q={q}
        sort={sort}
        dir={dir}
        placeholder="Search companies…"
        basePath="/companies"
        hasActiveFilters={Boolean(type || tag)}
      >
        <FilterSelect
          name="type"
          label="Type"
          value={type}
          options={[
            { value: "operator", label: "Operator" },
            { value: "landlord", label: "Landlord" },
            { value: "agent", label: "Agent" },
            { value: "vendor", label: "Vendor" },
            { value: "other", label: "Other" },
          ]}
        />
      </FilterBar>

      {rows.length > 0 && heatTags.length > 0 ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Portfolio Spread — sector × type</CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap
              rowLabels={heatTags}
              colLabels={heatTypes.map((t) => t.label)}
              matrix={heatMatrix}
              selectedRow={tag}
              selectedCol={heatTypes.find((t) => t.value === type)?.label}
              cellHref={(rowTag, _label, _ri, ci) =>
                filterHref(params, { tag: rowTag, type: heatTypes[ci].value })
              }
              rowHref={(rowTag) =>
                filterHref(params, { tag: rowTag === tag ? null : rowTag })
              }
              colHref={(_label, ci) => {
                const val = heatTypes[ci].value;
                return filterHref(params, { type: val === type ? null : val });
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {listRows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q || type || tag ? "No matches" : "No companies yet"}
          description={
            q || type || tag
              ? "Try a different search or filter."
              : "Add your first operator, landlord, agent or vendor."
          }
          action={
            q || type || tag ? undefined : (
              <Link
                href="/companies/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                New company
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="name" label="Name" params={params} />
              <SortHeader column="type" label="Type" params={params} />
              <TableHead>Sectors</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listRows.map((c) => {
              const t = companyTypeBadge(c.type);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge tone={t.tone}>{t.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.sector_tags.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.website ?? "—"}
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
