import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { filterHref } from "@/lib/sort";
import { cn } from "@/lib/utils";

export type PageWindow = {
  /** 1-based page number, clamped into the available range. */
  page: number;
  /** Number of the last page (always >= 1, even when there are no rows). */
  lastPage: number;
  /** 0-based slice bounds — use as `rows.slice(from, to)`. */
  from: number;
  to: number;
};

/**
 * Resolve the `page` search param against a known total. Non-numeric or
 * out-of-range values clamp to a valid page rather than rendering an empty
 * table (e.g. deep-linking `?page=9` after a filter shrinks the result set).
 */
export function resolvePage(
  raw: string | undefined,
  total: number,
  pageSize: number,
): PageWindow {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const parsed = Number.parseInt(raw ?? "", 10);
  const page = Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 1), lastPage)
    : 1;
  const from = (page - 1) * pageSize;
  return { page, lastPage, from, to: Math.min(from + pageSize, total) };
}

/**
 * Server-component pager: plain links, no client JS. Page links are built with
 * `filterHref`, so every other query param (search, facets, sort, silo, flex…)
 * is preserved. `params` should NOT contain `page` — leaving it out is what
 * makes every other link on the page (tiles, heatmap cells, sort headers) drop
 * back to page 1 when the filter changes.
 */
export function Pagination({
  params,
  state,
  total,
  noun,
  unfilteredTotal,
}: {
  params: Record<string, string | undefined>;
  state: PageWindow;
  /** Total rows in the *filtered* set (not just this page). */
  total: number;
  /** Plural noun for the summary line, e.g. "contacts". */
  noun: string;
  /** Total before the facet filters, when it differs — shown as "filtered from N". */
  unfilteredTotal?: number;
}) {
  if (total === 0) return null;
  const { page, lastPage, from, to } = state;
  const hrefForPage = (n: number) =>
    filterHref(params, { page: n <= 1 ? null : String(n) });
  const control = cn(buttonVariants({ variant: "secondary", size: "sm" }));
  const disabled = cn(control, "pointer-events-none opacity-50");
  const fmt = (n: number) => n.toLocaleString("en-GB");

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {fmt(from + 1)}–{fmt(to)}
        </span>{" "}
        of {fmt(total)} {noun}
        {unfilteredTotal != null && unfilteredTotal > total
          ? ` · filtered from ${fmt(unfilteredTotal)}`
          : ""}
      </p>

      {lastPage > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={hrefForPage(page - 1)} rel="prev" className={control}>
              <ChevronLeft />
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              <ChevronLeft />
              Previous
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            Page {fmt(page)} of {fmt(lastPage)}
          </span>
          {page < lastPage ? (
            <Link href={hrefForPage(page + 1)} rel="next" className={control}>
              Next
              <ChevronRight />
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              Next
              <ChevronRight />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
