"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Delete a disposal (RLS ensures it's the caller's agency). */
export async function deleteDisposal(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase.from("disposals").delete().eq("id", id);
    revalidatePath("/listings");
  }
  redirect("/listings");
}
