/**
 * Re-host CDG property media into our own Supabase Storage bucket.
 *
 * Why: the extractor returns imgix/S3 URLs that (a) carry CDG's watermark and
 * (b) live on a third party's CDN that can rotate or expire. For the CRM we
 * download the clean original and upload it to our `disposals` bucket, then point
 * the row's `images[].url` at our public URL — keeping `source_url` for provenance.
 *
 * Runs with whatever Supabase client is passed in. With no service-role key in this
 * project, that's the authenticated SSR client, so the `disposals` bucket's RLS
 * policies must allow the signed-in user to upload (see the migration).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { DisposalInsert } from "./cdg";
import { cleanImageUrl, contentTypeFromName, filenameFromUrl } from "./image";

export const DISPOSALS_BUCKET = "disposals";

export interface RehostOptions {
  bucket?: string;
  /** Strip the imgix watermark before downloading (default true). */
  clean?: boolean;
  /** Also re-host the marketing brochure PDF (default false). */
  includeBrochure?: boolean;
  userAgent?: string;
  signal?: AbortSignal;
}

export interface RehostResult {
  row: DisposalInsert;
  uploaded: number;
  failures: { url: string; error: string }[];
}

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

/**
 * Downloads each property image (and optionally the brochure) and uploads it to
 * Storage, returning a new row whose media URLs point at the bucket. Individual
 * download/upload failures are collected, not thrown — the original URL is kept for
 * any asset that fails so the import still succeeds with partial media.
 */
export async function rehostMedia(
  row: DisposalInsert,
  supabase: SupabaseClient,
  opts: RehostOptions = {},
): Promise<RehostResult> {
  const bucket = opts.bucket ?? DISPOSALS_BUCKET;
  const clean = opts.clean ?? true;
  const ua = opts.userAgent ?? DEFAULT_UA;
  const failures: { url: string; error: string }[] = [];
  let uploaded = 0;

  // Group everything under a stable per-listing prefix.
  const ref = row.source_ref ?? "unknown";
  const prefix = `${row.source}/${ref}`;

  const uploadFrom = async (
    originalUrl: string,
    objectName: string,
  ): Promise<string | null> => {
    const fetchUrl = clean ? cleanImageUrl(originalUrl) : originalUrl;
    try {
      const res = await fetch(fetchUrl, {
        headers: { "User-Agent": ua },
        signal: opts.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const path = `${prefix}/${objectName}`;
      const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
        contentType: contentTypeFromName(objectName),
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      uploaded++;
      return data.publicUrl;
    } catch (err) {
      failures.push({ url: fetchUrl, error: (err as Error).message });
      return null;
    }
  };

  const images = await Promise.all(
    row.images.map(async (img, i) => {
      const name = `${String(i + 1).padStart(2, "0")}-${filenameFromUrl(img.url, `image-${i + 1}`)}`;
      const publicUrl = await uploadFrom(img.url, name);
      return publicUrl
        ? { ...img, url: publicUrl, source_url: img.source_url ?? img.url }
        : img; // keep original on failure
    }),
  );

  let brochure_url = row.brochure_url;
  if (opts.includeBrochure && row.brochure_url) {
    const name = filenameFromUrl(row.brochure_url, "brochure.pdf");
    const publicUrl = await uploadFrom(row.brochure_url, name);
    if (publicUrl) brochure_url = publicUrl;
  }

  return { row: { ...row, images, brochure_url }, uploaded, failures };
}
