"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** slugify a label into a stable key: lowercase, non-alphanumeric → "_". */
function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "type";
}

function revalidate() {
  revalidatePath("/admin");
  revalidatePath("/companies");
}

/** Add a new company type. Writes are RLS-gated to agency admins. */
export async function createCompanyType(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const label = str(formData, "label");
  if (!label) return { error: "A type name is required." };

  const { data: existing } = await supabase
    .from("company_types")
    .select("slug, sort_order");
  const slugs = new Set((existing ?? []).map((t) => t.slug));

  let slug = slugify(label);
  if (slugs.has(slug)) {
    let n = 2;
    while (slugs.has(`${slug}_${n}`)) n++;
    slug = `${slug}_${n}`;
  }
  const maxSort = (existing ?? []).reduce((m, t) => Math.max(m, t.sort_order), 0);

  const { error } = await supabase
    .from("company_types")
    .insert({ slug, label, sort_order: maxSort + 1 });
  if (error) return { error: error.message };

  revalidate();
  return { message: `Added “${label}”.` };
}

/** Rename a type — updates the display label only; the stored slug stays stable
 * so existing companies keep their association. */
export async function renameCompanyType(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  const label = str(formData, "label");
  if (!id) return { error: "Missing type." };
  if (!label) return { error: "A type name is required." };

  const { error } = await supabase
    .from("company_types")
    .update({ label })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return { message: "Saved." };
}

/** Delete a type. Refuses the protected "Other" fallback and any type still in
 * use by a company (counted across all agencies via a definer helper). */
export async function deleteCompanyType(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing type." };

  const { data: type } = await supabase
    .from("company_types")
    .select("slug, label, is_system")
    .eq("id", id)
    .maybeSingle();
  if (!type) return { error: "Type not found." };
  if (type.is_system) return { error: "The “Other” type can’t be deleted." };

  const { data: inUse } = await supabase.rpc("company_type_in_use", {
    p_slug: type.slug,
  });
  const count = inUse ?? 0;
  if (count > 0) {
    return {
      error: `“${type.label}” is used by ${count} compan${
        count === 1 ? "y" : "ies"
      } — reassign them before deleting.`,
    };
  }

  const { error } = await supabase.from("company_types").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return { message: `Deleted “${type.label}”.` };
}
