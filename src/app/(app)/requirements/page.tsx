import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Target } from "lucide-react";

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
import { requirementStatusBadge } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Requirements" };

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("requirements")
    .select("id, title, status, target_towns, max_rent, company_id")
    .order("title");
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query;
  const rows = data ?? [];

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
        description="Acquisition briefs — the criteria matched against disposals."
        action={
          <Link href="/requirements/new" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus />
            New requirement
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
            placeholder="Search requirements…"
            aria-label="Search requirements"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title={q ? "No matches" : "No requirements yet"}
          description={
            q
              ? "Try a different search term."
              : "Capture an operator's acquisition brief to match against disposals."
          }
          action={
            q ? undefined : (
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
              <TableHead>Title</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Towns</TableHead>
              <TableHead>Max rent</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
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
