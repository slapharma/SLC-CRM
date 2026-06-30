"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const DOC_TYPES = ["floor_plan", "vendor", "brochure", "epc", "other"];
const DOCS_BUCKET = "disposal-docs";

/**
 * Record an uploaded document (#2). The file itself is uploaded to the private
 * `disposal-docs` bucket client-side; this just inserts the metadata row.
 */
export async function addDisposalDocument(
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

  const disposalId = str(formData, "disposal_id");
  const filePath = str(formData, "file_path");
  const name = str(formData, "name");
  if (!disposalId || !filePath || !name) return { error: "Missing file details." };

  const docType = str(formData, "doc_type");
  const sizeRaw = str(formData, "size_bytes");
  const size = sizeRaw ? Number(sizeRaw) : null;

  const { error } = await supabase.from("disposal_documents").insert({
    agency_id: agencyId,
    disposal_id: disposalId,
    name,
    doc_type: DOC_TYPES.includes(docType) ? docType : "other",
    file_path: filePath,
    size_bytes: Number.isFinite(size) ? size : null,
    uploaded_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/listings/${disposalId}`);
  return { message: "Document added." };
}

/** Remove a document row and its underlying storage object. */
export async function deleteDisposalDocument(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = str(formData, "id");
  const disposalId = str(formData, "disposal_id");
  if (!id || !agencyId) return;

  // Delete the metadata row scoped to our agency FIRST, then only remove the
  // storage object if a row we actually own was deleted — never touch another
  // agency's file.
  const { data: deleted } = await supabase
    .from("disposal_documents")
    .delete()
    .eq("id", id)
    .eq("agency_id", agencyId)
    .select("file_path")
    .maybeSingle();
  if (deleted?.file_path) {
    await supabase.storage.from(DOCS_BUCKET).remove([deleted.file_path]);
  }
  if (disposalId) revalidatePath(`/listings/${disposalId}`);
}
