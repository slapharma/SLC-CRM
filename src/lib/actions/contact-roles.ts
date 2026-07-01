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
  return base || "role";
}

function revalidate() {
  revalidatePath("/admin");
  revalidatePath("/contacts");
}

/** Add a new contact role. Writes are RLS-gated to agency admins. */
export async function createContactRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const label = str(formData, "label");
  if (!label) return { error: "A role name is required." };

  const { data: existing } = await supabase
    .from("contact_roles")
    .select("slug, sort_order");
  const slugs = new Set((existing ?? []).map((r) => r.slug));

  let slug = slugify(label);
  if (slugs.has(slug)) {
    let n = 2;
    while (slugs.has(`${slug}_${n}`)) n++;
    slug = `${slug}_${n}`;
  }
  const maxSort = (existing ?? []).reduce((m, r) => Math.max(m, r.sort_order), 0);

  const { error } = await supabase
    .from("contact_roles")
    .insert({ slug, label, sort_order: maxSort + 1 });
  if (error) return { error: error.message };

  revalidate();
  return { message: `Added “${label}”.` };
}

/** Rename a role — updates the display label only; the stored slug stays stable
 * so existing contacts keep their association. */
export async function renameContactRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  const label = str(formData, "label");
  if (!id) return { error: "Missing role." };
  if (!label) return { error: "A role name is required." };

  const { error } = await supabase
    .from("contact_roles")
    .update({ label })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return { message: "Saved." };
}

/** Delete a role. Refuses the protected "Other" fallback and any role still in
 * use by a contact (counted across all agencies via a definer helper). */
export async function deleteContactRole(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing role." };

  const { data: role } = await supabase
    .from("contact_roles")
    .select("slug, label, is_system")
    .eq("id", id)
    .maybeSingle();
  if (!role) return { error: "Role not found." };
  if (role.is_system) return { error: "The “Other” role can’t be deleted." };

  const { data: inUse } = await supabase.rpc("contact_role_in_use", {
    p_slug: role.slug,
  });
  const count = inUse ?? 0;
  if (count > 0) {
    return {
      error: `“${role.label}” is used by ${count} contact${
        count === 1 ? "" : "s"
      } — reassign them before deleting.`,
    };
  }

  const { error } = await supabase.from("contact_roles").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidate();
  return { message: `Deleted “${role.label}”.` };
}
