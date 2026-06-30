// URL-driven table sorting helpers (server-component friendly; no "use server").

export type SortDir = "asc" | "desc";

/** Build the href that sorts by `column`, toggling direction if already active. */
export function sortHref(
  params: Record<string, string | undefined>,
  column: string,
): string {
  const sameCol = params.sort === column;
  const dir: SortDir = sameCol && params.dir !== "desc" ? "desc" : "asc";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  sp.set("sort", column);
  sp.set("dir", dir);
  return `?${sp.toString()}`;
}

/**
 * Resolve a requested sort column against a whitelist → the DB column + ascending
 * flag. Falls back to `fallback` when the requested column isn't allowed.
 */
export function resolveSort(
  sort: string | undefined,
  dir: string | undefined,
  allowed: Record<string, string>,
  fallback: { column: string; ascending: boolean },
): { column: string; ascending: boolean } {
  if (sort && sort in allowed) {
    return { column: allowed[sort], ascending: dir !== "desc" };
  }
  return fallback;
}
