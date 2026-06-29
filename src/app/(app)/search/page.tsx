import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  companyTypeBadge,
  contactRoleBadge,
  listingStatusBadge,
  requirementStatusBadge,
  type BadgeSpec,
} from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const term = ((await searchParams).q ?? "").trim();

  if (!term) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Search" />
        <p className="text-sm text-muted-foreground">
          Search companies, contacts, listings and requirements from the bar above.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const like = `%${term}%`;
  const [companies, contacts, disposals, requirements] = await Promise.all([
    supabase.from("companies").select("id, name, type").ilike("name", like).limit(10),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, role")
      .or(`first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(10),
    supabase
      .from("disposals")
      .select("id, title, city, status")
      .or(`title.ilike.${like},city.ilike.${like}`)
      .limit(10),
    supabase.from("requirements").select("id, title, status").ilike("title", like).limit(10),
  ]);

  const total =
    (companies.data?.length ?? 0) +
    (contacts.data?.length ?? 0) +
    (disposals.data?.length ?? 0) +
    (requirements.data?.length ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Search" description={`Results for “${term}”`} />
      {total === 0 ? (
        <EmptyState icon={Search} title="No results" description="Try a different term." />
      ) : (
        <div className="space-y-6">
          <Group
            title="Companies"
            items={(companies.data ?? []).map((c) => ({
              href: `/companies/${c.id}`,
              label: c.name,
              badge: companyTypeBadge(c.type),
            }))}
          />
          <Group
            title="Contacts"
            items={(contacts.data ?? []).map((c) => ({
              href: `/contacts/${c.id}`,
              label: [c.first_name, c.last_name].filter(Boolean).join(" "),
              badge: contactRoleBadge(c.role),
            }))}
          />
          <Group
            title="Listings"
            items={(disposals.data ?? []).map((d) => ({
              href: `/listings/${d.id}`,
              label: `${d.title ?? "Untitled listing"}${d.city ? ` · ${d.city}` : ""}`,
              badge: listingStatusBadge(d.status),
            }))}
          />
          <Group
            title="Requirements"
            items={(requirements.data ?? []).map((r) => ({
              href: `/requirements/${r.id}`,
              label: r.title,
              badge: requirementStatusBadge(r.status),
            }))}
          />
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; badge: BadgeSpec }[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <ul className="divide-y rounded-lg border">
        {items.map((it, i) => (
          <li key={i}>
            <Link
              href={it.href}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted/40"
            >
              <span className="font-medium text-foreground">{it.label}</span>
              <Badge tone={it.badge.tone}>{it.badge.label}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
