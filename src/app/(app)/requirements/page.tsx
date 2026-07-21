import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CalendarPlus, Layers, Plus, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
import { FilterTiles } from "@/components/filter-tiles";
import { PageHeader } from "@/components/page-header";
import { RequirementsTable } from "@/components/requirements-table";
import { StatsBar } from "@/components/stats-bar";
import { buttonVariants } from "@/components/ui/button";
import { propertyUseBadge } from "@/lib/badges";
import { HOME_COUNTIES } from "@/lib/locations";
import { filterHref, resolveSort } from "@/lib/sort";
import { currentAgencyId, getAgencyMembers } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requirements" };

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    dir?: string;
    status?: string;
    loc?: string;
  }>;
}) {
  const { q, sort, dir, status, loc } = await searchParams;
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
      "id, title, status, target_towns, target_regions, target_counties, target_postcode_districts, max_rent, company_id, created_at, property_types, use_classes",
    )
    .order(column, { ascending });
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;
  // `rows` is the tile base (q filtered). The status facet is applied to the
  // table in memory so the tile counts always show the full distribution.
  const rows = data ?? [];
  const targetsOf = (r: (typeof rows)[number]) => [
    ...(r.target_towns ?? []),
    ...(r.target_regions ?? []),
    ...(r.target_counties ?? []),
    ...(r.target_postcode_districts ?? []),
  ];
  const matchesLoc = (r: (typeof rows)[number]) => {
    if (!loc) return true;
    const targets = targetsOf(r).map((t) => t.toLowerCase());
    if (loc === "Home Counties") {
      return (
        targets.includes("home counties") ||
        HOME_COUNTIES.some((hc) => targets.includes(hc.toLowerCase()))
      );
    }
    return targets.includes(loc.toLowerCase());
  };
  const listRows = rows.filter((r) => (!status || r.status === status) && matchesLoc(r));

  const params = { q, sort, dir, status, loc };

  const locOptions = [...new Set(rows.flatMap(targetsOf).filter(Boolean))]
    .sort()
    .map((v) => ({ value: v, label: v }));

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

  // Companies double as the operator-name lookup and the Send Deal company picker.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const agencyId = await currentAgencyId(supabase);
  const [members, { data: companyRows }, { data: contactRows }] = await Promise.all([
    agencyId ? getAgencyMembers(supabase, agencyId) : Promise.resolve([]),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("contacts").select("id, first_name, last_name").order("first_name"),
  ]);
  const companies = companyRows ?? [];
  const names = new Map(companies.map((c) => [c.id, c.name]));
  const contacts = (contactRows ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed contact",
  }));

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
        hasActiveFilters={Boolean(status || loc)}
      >
        <FilterSelect
          name="loc"
          label="Target location"
          value={loc}
          options={locOptions}
        />
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
        <RequirementsTable
          rows={listRows.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            operatorName: r.company_id ? (names.get(r.company_id) ?? null) : null,
            towns: r.target_towns.join(", "),
            maxRent: r.max_rent,
          }))}
          params={params}
          agents={members}
          meId={user?.id}
          companies={companies}
          contacts={contacts}
        />
      )}
    </div>
  );
}
