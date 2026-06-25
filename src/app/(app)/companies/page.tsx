import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
import { companyTypeBadge } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("id, name, type, sector_tags, website")
    .order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;
  const rows = data ?? [];

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

      <form className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Search companies…"
            aria-label="Search companies"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q ? "No matches" : "No companies yet"}
          description={
            q
              ? "Try a different search term."
              : "Add your first operator, landlord, agent or vendor."
          }
          action={
            q ? undefined : (
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
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sectors</TableHead>
              <TableHead>Website</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
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
