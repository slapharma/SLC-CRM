import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CompanyType = {
  id: string;
  slug: string;
  label: string;
  sort_order: number;
  is_system: boolean;
};

/**
 * The system-wide company-type list (editable in Admin → "Edit company types").
 * Cached per request so a page can call it from several spots without re-querying.
 */
export const getCompanyTypes = cache(async (): Promise<CompanyType[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_types")
    .select("id, slug, label, sort_order, is_system")
    .order("sort_order", { ascending: true });
  return data ?? [];
});

/** Title-case a bare slug as a last-resort label for a type no longer in the list. */
export function prettifyTypeSlug(slug: string): string {
  return slug ? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}

/** Resolve a stored slug to its editable display label (falls back to the slug). */
export function typeLabel(
  types: { slug: string; label: string }[],
  slug: string,
): string {
  return types.find((t) => t.slug === slug)?.label ?? prettifyTypeSlug(slug);
}
