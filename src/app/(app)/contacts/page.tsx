import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

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
import { contactRoleBadge } from "@/lib/badges";
import { getContactRoles, roleLabel } from "@/lib/contact-roles";
import { filterHref, resolveSort } from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; role?: string }>;
}) {
  const { q, sort, dir, role } = await searchParams;
  const supabase = await createClient();

  const { column, ascending } = resolveSort(
    sort,
    dir,
    { name: "first_name", role: "role" },
    { column: "first_name", ascending: true },
  );

  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, role, email, phone, company_id, city")
    .order(column, { ascending });
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  const { data } = await query;
  const mapLayers = await getMapLayers(supabase, { include: ["contact"] });
  // `rows` is the tile base (q filtered). The role facet is applied to the table
  // in memory so the tile counts always show the full distribution.
  const rows = data ?? [];
  const listRows = role ? rows.filter((c) => c.role === role) : rows;

  const params = { q, sort, dir, role };

  const roles = await getContactRoles();
  const roleOptions = roles.map((r) => ({ value: r.slug, label: r.label }));
  const roleTiles = roleOptions.map((r) => ({
    ...r,
    count: rows.filter((c) => c.role === r.value).length,
  }));

  // Heatmap: town × role — rows are the top 8 towns, columns the roles present.
  // The contacts page filters by `role` only (no town param), so role columns
  // are clickable to facet while town rows stay static counts.
  const townCounts = new Map<string, number>();
  for (const c of rows) {
    const t = c.city ?? "—";
    townCounts.set(t, (townCounts.get(t) ?? 0) + 1);
  }
  const heatTowns = [...townCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);
  const roleCounts = new Map<string, number>();
  for (const c of rows) {
    const rSlug = c.role ?? "—";
    roleCounts.set(rSlug, (roleCounts.get(rSlug) ?? 0) + 1);
  }
  const heatRoles = [...roleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((e) => e[0]);
  const cellCounts = new Map<string, number>();
  for (const c of rows) {
    const key = `${c.city ?? "—"}|${c.role ?? "—"}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
  }
  const heatMatrix = heatTowns.map((t) =>
    heatRoles.map((rSlug) => cellCounts.get(`${t}|${rSlug}`) ?? 0),
  );

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
        title="Contacts"
        description="People at operators, landlords and agencies."
        action={
          <Link href="/contacts/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New contact
          </Link>
        }
      />

      <FilterBar
        q={q}
        sort={sort}
        dir={dir}
        placeholder="Search contacts…"
        basePath="/contacts"
        hasActiveFilters={Boolean(role)}
      >
        <FilterSelect name="role" label="Role" value={role} options={roleOptions} />
      </FilterBar>

      {rows.length > 0 ? (
        <FilterTiles
          tiles={roleTiles}
          activeValue={role}
          hrefFor={(v) => filterHref(params, { role: v === role ? null : v })}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <Card className="hidden sm:block">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Portfolio Spread — town × role</CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap
                compact
                rowLabels={heatTowns}
                colLabels={heatRoles.map((slug) => roleLabel(roles, slug))}
                matrix={heatMatrix}
                selectedCol={role ? roleLabel(roles, role) : undefined}
                colHref={(_label, ci) => {
                  const slug = heatRoles[ci];
                  return filterHref(params, { role: slug === role ? null : slug });
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Location heat-map</CardTitle>
            </CardHeader>
            <CardContent>
              <ConcentrationMap layers={mapLayers} defaultActive="contact" compact />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {listRows.length > 0 && listRows.length < rows.length ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Showing {listRows.length} of {rows.length}
        </p>
      ) : null}

      {listRows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || role ? "No matches" : "No contacts yet"}
          description={
            q || role
              ? "Try a different search or filter."
              : "Add the people behind your companies."
          }
          action={
            q || role ? undefined : (
              <Link href="/contacts/new" className={cn(buttonVariants({ size: "sm" }))}>
                New contact
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader column="name" label="Name" params={params} />
              <SortHeader column="role" label="Role" params={params} />
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listRows.map((c) => {
              const r = contactRoleBadge(c.role, roleLabel(roles, c.role));
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/contacts/${c.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge tone={r.tone}>{r.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.company_id ? (names.get(c.company_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {c.phone ?? "—"}
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
