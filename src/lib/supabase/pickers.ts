import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type PickOption = { id: string; name: string };

/** Companies in the agency as pickable options (id + name), sorted by name. */
export async function getCompanyOptions(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<PickOption[]> {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("agency_id", agencyId)
    .order("name");
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

/** Contacts in the agency as pickable options (id + "First Last"), sorted by name. */
export async function getContactOptions(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<PickOption[]> {
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("agency_id", agencyId)
    .order("first_name");
  return (data ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed contact",
  }));
}
