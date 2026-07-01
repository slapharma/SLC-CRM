"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type ActivityType = Database["public"]["Enums"]["activity_type"];
type EntityType = Database["public"]["Enums"]["entity_type"];

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const oneOf = <T extends string>(v: string, allowed: readonly T[], fb: T): T =>
  (allowed as readonly string[]).includes(v) ? (v as T) : fb;

const PATH: Record<string, string> = {
  company: "companies",
  contact: "contacts",
  listing: "listings",
  requirement: "requirements",
  deal: "deals",
};

export async function logActivity(
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

  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!subject && !body) return { error: "Add a subject or a note." };

  const entityType = str(formData, "entity_type");
  const entityId = str(formData, "entity_id") || null;

  // Optional back-dating: a yyyy-mm-dd from the form maps to that day; blank/
  // invalid falls back to the column default (insert time).
  const occurredOn = str(formData, "occurred_on");
  const occurredAt =
    occurredOn && /^\d{4}-\d{2}-\d{2}$/.test(occurredOn)
      ? new Date(`${occurredOn}T12:00:00`).toISOString()
      : null;

  const { error } = await supabase.from("activities").insert({
    agency_id: agencyId,
    created_by: user.id,
    type: oneOf<ActivityType>(
      str(formData, "type"),
      Constants.public.Enums.activity_type,
      "note",
    ),
    subject: subject || null,
    body: body || null,
    entity_type: entityType
      ? oneOf<EntityType>(entityType, Constants.public.Enums.entity_type, "company")
      : null,
    entity_id: entityId,
    ...(occurredAt ? { occurred_at: occurredAt } : {}),
  });
  if (error) return { error: error.message };

  if (entityType && entityId && PATH[entityType]) {
    revalidatePath(`/${PATH[entityType]}/${entityId}`);
  }
  revalidatePath("/dashboard");
  return { message: "Activity logged." };
}
