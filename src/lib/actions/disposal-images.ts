"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const IMAGES_BUCKET = "disposals";
// Public-URL marker for objects we host ourselves — only those are deleted
// from storage; scraped rows may reference third-party URLs we must not touch.
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${IMAGES_BUCKET}/`;

type ImageItem = { url: string; alt?: string | null; source_url?: string | null };

const rowImages = (raw: unknown): ImageItem[] =>
  (Array.isArray(raw) ? raw : []).filter(
    (i): i is ImageItem => !!i && typeof (i as ImageItem).url === "string",
  );

/**
 * Append an uploaded photo to `disposals.images`. The file itself is uploaded
 * client-side to the public `disposals` bucket (same split as
 * disposal-documents); this records the metadata entry the gallery and the
 * PDF hero already read (`{ url, alt, source_url }`).
 */
export async function addDisposalImage(
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
  const url = str(formData, "url");
  if (!disposalId || !url) return { error: "Missing image details." };
  if (!/^https?:\/\//i.test(url)) return { error: "Invalid image URL." };

  const { data: row } = await supabase
    .from("disposals")
    .select("images")
    .eq("id", disposalId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!row) return { error: "This listing no longer exists." };

  const images = rowImages(row.images);
  if (images.some((i) => i.url === url)) return { message: "Image added." };

  const { error } = await supabase
    .from("disposals")
    .update({ images: [...images, { url, alt: null, source_url: null }] })
    .eq("id", disposalId)
    .eq("agency_id", agencyId);
  if (error) return { error: error.message };

  revalidatePath(`/listings/${disposalId}`);
  return { message: "Image added." };
}

/** Remove an image entry (and its storage object when we host it). */
export async function deleteDisposalImage(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return;

  const disposalId = str(formData, "disposal_id");
  const url = str(formData, "url");
  if (!disposalId || !url) return;

  const { data: row } = await supabase
    .from("disposals")
    .select("images")
    .eq("id", disposalId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (!row) return;

  const images = rowImages(row.images);
  const remaining = images.filter((i) => i.url !== url);
  if (remaining.length === images.length) return;

  const { error } = await supabase
    .from("disposals")
    .update({ images: remaining })
    .eq("id", disposalId)
    .eq("agency_id", agencyId);
  if (error) return;

  // Only delete files from our own public bucket — never a third-party URL,
  // and only AFTER the row no longer references it.
  const markerAt = url.indexOf(PUBLIC_PATH_MARKER);
  if (markerAt !== -1) {
    const path = decodeURIComponent(
      url.slice(markerAt + PUBLIC_PATH_MARKER.length).split("?")[0],
    );
    if (path) await supabase.storage.from(IMAGES_BUCKET).remove([path]);
  }

  revalidatePath(`/listings/${disposalId}`);
}
