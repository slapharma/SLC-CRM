import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A row of clickable count "blocks" used as filters on pages without a 2-D
 * heatmap (enquiries, contacts). Each tile links to the same page with the
 * filter applied; the active tile is highlighted. `hrefFor` should toggle the
 * value off when it's already active (handled by the caller).
 */
export function FilterTiles({
  tiles,
  activeValue,
  hrefFor,
}: {
  tiles: { label: string; value: string; count: number }[];
  activeValue?: string;
  hrefFor: (value: string) => string;
}) {
  if (tiles.length === 0) return null;
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => {
        const active = Boolean(activeValue) && t.value === activeValue;
        return (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            aria-pressed={active}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors",
              active
                ? "border-primary bg-primary/10"
                : "hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            <span className="font-mono text-xl font-semibold tabular-nums">
              {t.count.toLocaleString("en-GB")}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {t.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
