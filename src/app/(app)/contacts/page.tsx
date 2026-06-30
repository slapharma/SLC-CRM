import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { FilterBar, FilterSelect } from "@/components/filter-bar";
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
import { contactRoleBadge } from "@/lib/badges";
import { resolveSort } from "@/lib/sort";
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
    .select("id, first_name, last_name, role, email, phone, company_id")
    .order(column, { ascending });
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  if (role) query = query.eq("role", role as never);
  const { data } = await query;
  const rows = data ?? [];

  const params = { q, sort, dir, role };

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
        <FilterSelect
          name="role"
          label="Role"
          value={role}
          options={[
            { value: "acquisitions", label: "Acquisitions" },
            { value: "landlord", label: "Landlord" },
            { value: "solicitor", label: "Solicitor" },
            { value: "agent", label: "Agent" },
            { value: "finance", label: "Finance" },
            { value: "other", label: "Other" },
          ]}
        />
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "No matches" : "No contacts yet"}
          description={
            q ? "Try a different search term." : "Add the people behind your companies."
          }
          action={
            q ? undefined : (
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
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const r = contactRoleBadge(c.role);
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
                  <TableCell className="text-muted-foreground">
                    {c.company_id ? (names.get(c.company_id) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
