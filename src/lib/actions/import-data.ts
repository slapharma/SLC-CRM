"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/lib/database.types";
import { parseCsv, type ImportEntity } from "@/lib/csv";
import type { FormState } from "@/lib/actions/types";

const ENTITIES: ImportEntity[] = ["companies", "contacts", "requirements", "listings"];
const TABLE: Record<ImportEntity, string> = {
  companies: "companies",
  contacts: "contacts",
  requirements: "requirements",
  listings: "disposals",
};

const list = (v: string) =>
  v.split(";").map((s) => s.trim()).filter(Boolean);
const numOrNull = (v: string) => {
  const n = Number(v.replace(/[, ]/g, ""));
  return v.trim() && Number.isFinite(n) ? n : null;
};
const boolOf = (v: string) => /^(true|yes|y|1)$/i.test(v.trim());
const oneOf = (v: string, allowed: readonly string[], fb: string) =>
  allowed.includes(v) ? v : fb;

/** Bulk-import CSV rows into companies / contacts / requirements / listings (#8). */
export async function importEntityCsv(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const entity = String(formData.get("entity") ?? "") as ImportEntity;
  const csv = String(formData.get("csv") ?? "");
  if (!ENTITIES.includes(entity)) return { error: "Unknown import type." };
  if (!csv.trim()) return { error: "Upload a CSV file first." };

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { error: "Need a header row plus at least one data row." };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const colIdx = (name: string) => header.indexOf(name);

  // Contact roles + company types are editable data now — validate imported
  // values against the live slug lists (fallbacks "other") rather than a fixed enum.
  const { data: roleRows } = await supabase.from("contact_roles").select("slug");
  const roleSlugs = (roleRows ?? []).map((r) => r.slug);
  const { data: typeRows } = await supabase.from("company_types").select("slug");
  const typeSlugs = (typeRows ?? []).map((t) => t.slug);

  // Every listing and requirement MUST have a contact (mirrors the UI actions).
  // CSV rows carry a `contact_email` that we resolve to an agency contact; rows
  // whose contact_email is missing or unknown are reported and skipped.
  const { data: contactRows } = await supabase.from("contacts").select("id, email");
  const contactByEmail = new Map<string, string>();
  for (const c of contactRows ?? []) {
    if (c.email) contactByEmail.set(c.email.trim().toLowerCase(), c.id);
  }
  const resolveContact = (email: string) =>
    email ? contactByEmail.get(email.trim().toLowerCase()) : undefined;

  const base = { agency_id: agencyId, created_by: user.id };
  const records: Record<string, unknown>[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((r, n) => {
    const get = (name: string) => {
      const i = colIdx(name);
      return i >= 0 ? (r[i] ?? "").trim() : "";
    };
    try {
      if (entity === "companies") {
        if (!get("name")) throw new Error("name is required");
        records.push({
          ...base,
          name: get("name"),
          type: oneOf(get("type"), typeSlugs, "other"),
          sector_tags: list(get("sector_tags")),
          website: get("website") || null,
          phone: get("phone") || null,
          notes: get("notes") || null,
        });
      } else if (entity === "contacts") {
        if (!get("first_name")) throw new Error("first_name is required");
        records.push({
          ...base,
          first_name: get("first_name"),
          last_name: get("last_name") || null,
          email: get("email") || null,
          phone: get("phone") || null,
          role: oneOf(get("role"), roleSlugs, "other"),
          marketing_opt_in: boolOf(get("marketing_opt_in")),
          notes: get("notes") || null,
        });
      } else if (entity === "requirements") {
        if (!get("title")) throw new Error("title is required");
        const contactId = resolveContact(get("contact_email"));
        if (!contactId)
          throw new Error("contact_email is required and must match an existing contact");
        records.push({
          ...base,
          title: get("title"),
          contact_id: contactId,
          status: oneOf(get("status"), Constants.public.Enums.requirement_status, "active"),
          target_towns: list(get("target_towns")),
          target_regions: list(get("target_regions")),
          max_rent: numOrNull(get("max_rent")),
          notes: get("notes") || null,
        });
      } else {
        if (!get("title")) throw new Error("title is required");
        const contactId = resolveContact(get("contact_email"));
        if (!contactId)
          throw new Error("contact_email is required and must match an existing contact");
        const dt = get("disposal_type");
        records.push({
          ...base,
          source: "import",
          title: get("title"),
          contact_id: contactId,
          status: get("status") || null,
          disposal_type: ["freehold", "new_lease", "lease_assignment", "sublease", "unknown"].includes(dt)
            ? dt
            : "unknown",
          city: get("city") || null,
          postcode: get("postcode") || null,
          use_class: get("use_class") || null,
          size_sqft: numOrNull(get("size_sqft")),
          rent_pa: numOrNull(get("rent_pa")),
          premium: numOrNull(get("premium")),
          description: get("description") || null,
        });
      }
    } catch (e) {
      errors.push(`Row ${n + 2}: ${(e as Error).message}`);
    }
  });

  let inserted = 0;
  if (records.length) {
    const { error } = await supabase
      .from(TABLE[entity] as never)
      .insert(records as never);
    if (error) return { error: error.message };
    inserted = records.length;
  }

  const path = `/${entity}`;
  revalidatePath(path);

  const skipped = errors.length
    ? ` Skipped ${errors.length}: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "…" : ""}`
    : "";
  if (!inserted && errors.length) return { error: `Nothing imported.${skipped}` };
  return { message: `Imported ${inserted} ${entity}.${skipped}` };
}
