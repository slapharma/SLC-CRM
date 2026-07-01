import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type ContactRole = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_system: boolean;
};

/**
 * The system-wide contact-role list (editable in Admin → "Edit roles").
 * Cached per request so a page can call it from several spots without re-querying.
 */
export const getContactRoles = cache(async (): Promise<ContactRole[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_roles")
    .select("id, slug, label, sort_order, is_system")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

/** Title-case a bare slug as a last-resort label for a role no longer in the list. */
export function prettifyRoleSlug(slug: string): string {
  return slug ? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

/** Resolve a stored slug to its editable display label (falls back to the slug). */
export function roleLabel(
  roles: { slug: string; label: string }[],
  slug: string,
): string {
  return roles.find((r) => r.slug === slug)?.label ?? prettifyRoleSlug(slug);
}
