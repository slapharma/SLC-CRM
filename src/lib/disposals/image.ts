/**
 * Image-URL helpers for CDG / Agents' Society media.
 *
 * CDG serves property photos through imgix with a watermark overlay baked in via
 * query params (`?mark=<logo>&mark-alpha=90&mark-scale=30&mark-align=right,bottom`).
 * For our own CRM we want the clean original, so we strip the `mark*` params. Other
 * imgix params (sizing, crop, a signature `s=`) are preserved untouched.
 *
 * Pure module — no Next/Supabase imports, trivially unit-testable.
 */

/** True if the URL carries imgix watermark (`mark*`) params. */
export function isWatermarked(url: string): boolean {
  try {
    const u = new URL(url);
    for (const key of u.searchParams.keys()) {
      if (key === "mark" || key.startsWith("mark-")) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Returns the URL with imgix watermark params removed. Non-watermark params are
 * kept. Invalid URLs are returned unchanged.
 */
export function cleanImageUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key === "mark" || key.startsWith("mark-")) u.searchParams.delete(key);
    }
    // Drop a now-empty "?" for a tidy URL.
    const qs = u.searchParams.toString();
    u.search = qs ? `?${qs}` : "";
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Derives a safe, lowercased filename (with extension) from an image/asset URL.
 * Falls back to `fallback` if the path has no usable basename.
 * e.g. ".../e5e8…-frontage.jpeg?mark=…" → "e5e8…-frontage.jpeg".
 */
export function filenameFromUrl(url: string, fallback = "image"): string {
  let base = fallback;
  try {
    const path = new URL(url).pathname;
    const last = decodeURIComponent(path.split("/").pop() ?? "");
    if (last) base = last;
  } catch {
    /* keep fallback */
  }
  // Strip any leftover query/hash, normalise to a storage-safe slug.
  base = base.split(/[?#]/)[0];
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

/** Best-effort content-type from a filename extension. */
export function contentTypeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}
