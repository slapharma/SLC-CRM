"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Database } from "@/lib/database.types";
import type { FormState } from "@/lib/actions/types";

type ContactRole = Database["public"]["Enums"]["contact_role"];

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nullable = (fd: FormData, k: string) => str(fd, k) || null;
const asRole = (v: string): ContactRole =>
  (Constants.public.Enums.contact_role as readonly string[]).includes(v)
    ? (v as ContactRole)
    : "other";

/** Lead agent + additional agents (de-duped, lead excluded from extras). */
const agents = (fd: FormData) => {
  const lead = nullable(fd, "lead_agent_id");
  const extra = Array.from(
    new Set(fd.getAll("additional_agents").map((v) => String(v)).filter(Boolean)),
  ).filter((id) => id !== lead);
  return { lead, extra };
};

function payload(fd: FormData) {
  return {
    first_name: str(fd, "first_name"),
    last_name: nullable(fd, "last_name"),
    email: nullable(fd, "email"),
    phone: nullable(fd, "phone"),
    role: asRole(str(fd, "role")),
    company_id: nullable(fd, "company_id"),
    notes: nullable(fd, "notes"),
    lead_agent_id: nullable(fd, "lead_agent_id"),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Replace a contact's additional-agent rows. */
async function syncContactAgents(
  supabase: Supabase,
  contactId: string,
  agencyId: string,
  extra: string[],
) {
  await supabase.from("contact_agents").delete().eq("contact_id", contactId);
  if (extra.length > 0) {
    await supabase.from("contact_agents").insert(
      extra.map((user_id) => ({
        agency_id: agencyId,
        contact_id: contactId,
        user_id,
      })),
    );
  }
}

export async function createContact(
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

  const data = payload(formData);
  if (!data.first_name) return { error: "A first name is required." };

  const { data: row, error } = await supabase
    .from("contacts")
    .insert({ agency_id: agencyId, created_by: user.id, ...data })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await syncContactAgents(supabase, row.id, agencyId, agents(formData).extra);

  revalidatePath("/contacts");
  redirect(`/contacts/${row.id}`);
}

export async function updateContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const id = str(formData, "id");
  if (!id) return { error: "Missing contact id." };

  const data = payload(formData);
  if (!data.first_name) return { error: "A first name is required." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const { error } = await supabase.from("contacts").update(data).eq("id", id);
  if (error) return { error: error.message };

  await syncContactAgents(supabase, id, agencyId, agents(formData).extra);

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("contacts").delete().eq("id", id);
    revalidatePath("/contacts");
  }
  redirect("/contacts");
}
