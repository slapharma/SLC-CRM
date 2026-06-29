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

function payload(fd: FormData) {
  return {
    first_name: str(fd, "first_name"),
    last_name: nullable(fd, "last_name"),
    email: nullable(fd, "email"),
    phone: nullable(fd, "phone"),
    role: asRole(str(fd, "role")),
    company_id: nullable(fd, "company_id"),
    notes: nullable(fd, "notes"),
  };
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

  const { error } = await supabase.from("contacts").update(data).eq("id", id);
  if (error) return { error: error.message };

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
