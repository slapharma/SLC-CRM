import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { ConcentrationMap } from "@/components/concentration-map-lazy";
import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { FilterTiles } from "@/components/filter-tiles";
import { Heatmap } from "@/components/heatmap";
import { PageHeader } from "@/components/page-header";
import { Pagination, resolvePage } from "@/components/pagination";
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
import { companyTypeBadge } from "@/lib/badges";
import { deriveCounty, HOME_COUNTIES } from "@/lib/locations";
import { getCompanyTypes, typeLabel } from "@/lib/company-types";
import { escapeLike } from "@/lib/search";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Companies" };

// Table rows per page. The stats tiles/heatmap/facets keep describing the whole
// filtered set — only the table below them is paginated.
const PAGE_SIZE = 25;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    type?: string;
    tag?: string;
    town?: string;
    county?: string;
    page?: string;
  }>;
}) {
  const { q, sort, dir, type, tag, town, county, page: pageParam } = await searchParams;
  const supabase = await createClient();

  const { column, ascending } = resolveSort(
    sort,
    dir,
    { name: "name", type: "type" },
    { column: "name", ascending: true },
  );

  // Aggregate pass: only the columns the tiles, heatmap and facet dropdowns
  // need (plus the id, which the paginated row fetch keys off). Ordered here so
  // the page slice below is taken from the fully sorted set.
  let query = supabase
    .from("companies")
    .select("id, type, sector_tags, city, postcode, county")
    .order(column, { ascending });
  if (q) query = query.ilike("name", `%${escapeLike(q)}%`);
  const { data } = await query;
  const mapLayers = await getMapLayers(supabase, { include: ["company"] });
  const companyTypes = await getCompanyTypes();
  // `rows` is the heatmap base (q filtered). The tag/type facets that the
  // heatmap controls are applied to the table in memory so the grid keeps the
  // full distribution.
  const rows = (data ?? []).map((c) => ({
    ...c,
    county: c.county ?? deriveCounty({ postcode: c.postcode, city: c.city }),
  }));
  const matchesCounty = (rowCounty: string | null) =>
    !county ||
    (county === "Home Counties"
      ? rowCounty != null && HOME_COUNTIES.includes(rowCounty)
      : (rowCounty ?? "—") === county);
  const listRows = rows.filter(
    (c) =>
      (!type || c.type === type) &&
      (!tag || c.sector_tags.includes(tag)) &&
      (!town || (c.city ?? "—") === town) &&
      matchesCounty(c.county),
  );

  const params = { q, sort, dir, type, tag, town, county };

  const townOptions = [...new Set(rows.map((c) => c.city).filter(Boolean))]
    .sort()
    .map((v) => ({ value: v as string, label: v as string }));
  const countyValues = [...new Set(rows.map((c) => c.county).filter(Boolean))].sort();
  const countyOptions = [
    ...(countyValues.some((c) => HOME_COUNTIES.includes(c as string))
      ? [{ value: "Home Counties", label: "Home Counties" }]
      : []),
    ...countyValues.map((v) => ({ value: v as string, label: v as string })),
  ];

  // Stats bar: counts per company type (whole q-filtered set), click to facet.
  // Types are editable data, so derive tiles from the live list (admin-chosen labels).
  const typeTiles = [
    { value: "", label: "All", count: rows.length },
    ...companyTypes.map((ct) => ({
      value: ct.slug,
      label: ct.label,
      count: rows.filter((c) => c.type === ct.slug).length,
    })),
  ];

  // Heatmap: sector tag × company type — click a cell/label to filter below.
  const tagCounts = new Map<string, number>();
  for (const c of rows) for (const t of c.sector_tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const heatTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);
  const heatTypes = companyTypes.map((ct) => ({ value: ct.slug, label: ct.label }));
  const cellCounts = new Map<string, number>();
  for (const c of rows) {
    for (const t of c.sector_tags) {
      const key = `${t}|${c.type}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
  }
  const heatMatrix = heatTags.map((tag) =>
    heatTypes.map((ty) => cellCounts.get(`${tag}|${ty.value}`) ?? 0),
  );

  // Pagination: the facets above are computed from the full filtered set, so
  // the page total is exact; only the current page's rows are fetched in full.
  const total = listRows.length;
  const pageState = resolvePage(pageParam, total, PAGE_SIZE);
  const pageIds = listRows.slice(pageState.from, pageState.to).map((c) => c.id);

  const { data: detail } = pageIds.length
    ? await supabase
        .from("companies")
        .select("id, name, type, sector_tags, website")
        .in("id", pageIds)
    : { data: [] };
  // `.in()` does not preserve the requested order — re-apply the sorted slice.
  const byId = new Map((detail ?? []).map((c) => [c.id, c]));
  const pageRows = pageIds
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => c != null);

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
        hasActiveFilters={Boolean(type || tag || town || county)}
      >
        <FilterSelect
          name="type"
          label="Type"
          value={type}
          options={companyTypes.map((t) => ({ value: t.slug, label: t.label }))}
        />
        <FilterSelect name="town" label="Town" value={town} options={townOptions} />
        <FilterSelect name="county" label="County" value={county} options={countyOptions} />
      </FilterBar>

      {rows.length > 0 ? (
        <FilterTiles
          tiles={typeTiles}
          activeValue={type ?? ""}
          hrefFor={(v) => filterHref(params, { type: v === type ? null : v || null })}
        />
      ) : null}

      {rows.length > 0 && heatTags.length > 0 ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Card className="hidden sm:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Portfolio Spread — sector × type</CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap
                compact
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Location heat-map</CardTitle>
            </CardHeader>
            <CardContent>
              <ConcentrationMap layers={mapLayers} defaultActive="company" compact />
            </CardContent>
          </Card>
        </div>
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
              <TableHead className="hidden md:table-cell">Sectors</TableHead>
              <TableHead className="hidden md:table-cell">Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((c) => {
              const t = companyTypeBadge(c.type, typeLabel(companyTypes, c.type));
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
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.sector_tags.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.website ?? "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Pagination
        params={params}
        state={pageState}
        total={total}
        noun="companies"
        unfilteredTotal={rows.length}
      />
    </div>
  );
}
