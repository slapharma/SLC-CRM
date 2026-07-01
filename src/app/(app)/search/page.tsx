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
import { getContactRoles, roleLabel } from "@/lib/contact-roles";
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
          Search companies, contacts, listings and enquiries from the bar above.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const like = `%${term}%`;
  const [companies, contactsByField, disposals, requirements] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, type")
      .or(`name.ilike.${like},phone.ilike.${like},website.ilike.${like}`)
      .limit(10),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, role")
      .or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      )
      .limit(10),
    supabase
      .from("disposals")
      .select("id, title, city, status")
      .or(
        `title.ilike.${like},city.ilike.${like},postcode.ilike.${like},address_line.ilike.${like},area.ilike.${like}`,
      )
      .limit(10),
    supabase
      .from("requirements")
      .select("id, title, status")
      .or(`title.ilike.${like},notes.ilike.${like}`)
      .limit(10),
  ]);

  // Also surface contacts found via their firm (company name match), deduped.
  let contactRows = contactsByField.data ?? [];
  const companyIds = (companies.data ?? []).map((c) => c.id);
  if (companyIds.length) {
    const { data: byFirm } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, role")
      .in("company_id", companyIds)
      .limit(10);
    const seen = new Set(contactRows.map((c) => c.id));
    contactRows = [...contactRows, ...(byFirm ?? []).filter((c) => !seen.has(c.id))].slice(
      0,
      10,
    );
  }

  const contactRoles = await getContactRoles();

  const total =
    (companies.data?.length ?? 0) +
    contactRows.length +
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
            items={contactRows.map((c) => ({
              href: `/contacts/${c.id}`,
              label: [c.first_name, c.last_name].filter(Boolean).join(" "),
              badge: contactRoleBadge(c.role, roleLabel(contactRoles, c.role)),
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
            title="Enquiries"
            items={(requirements.data ?? []).map((r) => ({
              href: `/enquiries/${r.id}`,
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
