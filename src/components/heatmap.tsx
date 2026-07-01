import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * A density heatmap: rowLabels × colLabels grid, each cell shaded by its count
 * relative to the busiest cell. Server-rendered (CSS grid, no chart dep).
 *
 * Optionally interactive: when `cellHref`/`rowHref`/`colHref` are supplied the
 * cells and labels become filter links, and `selectedRow`/`selectedCol`
 * highlight the active slice. Omit them and it renders as a static chart.
 */
export function Heatmap({
  rowLabels,
  colLabels,
  matrix,
  empty = "Not enough data to chart yet.",
  cellHref,
  rowHref,
  colHref,
  selectedRow,
  selectedCol,
  compact = false,
}: {
  rowLabels: string[];
  colLabels: string[];
  matrix: number[][];
  empty?: string;
  cellHref?: (
    rowLabel: string,
    colLabel: string,
    rowIndex: number,
    colIndex: number,
  ) => string | undefined;
  rowHref?: (rowLabel: string, rowIndex: number) => string;
  colHref?: (colLabel: string, colIndex: number) => string;
  selectedRow?: string;
  selectedCol?: string;
  // Smaller cells + narrower label gutter, for the side-by-side portfolio layout.
  compact?: boolean;
}) {
  if (rowLabels.length === 0 || colLabels.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(1, ...matrix.flat());
  const rowGutter = compact ? "5.5rem" : "7rem";
  const colMin = compact ? "2.5rem" : "3.5rem";
  const cellHeight = compact ? "h-7" : "h-9";

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `minmax(${rowGutter}, auto) repeat(${colLabels.length}, minmax(${colMin}, 1fr))`,
        }}
      >
        <div />
        {colLabels.map((c, ci) => {
          const href = colHref?.(c, ci);
          const active = selectedCol != null && selectedCol !== "" && c === selectedCol;
          const cls = cn(
            "truncate px-1 pb-1 text-center text-[11px] font-medium",
            active ? "text-foreground" : "text-muted-foreground",
          );
          return href ? (
            <Link
              key={c}
              href={href}
              title={`Filter by ${c}`}
              className={cn(
                cls,
                "rounded transition-colors hover:bg-muted/60 hover:text-foreground",
                active && "bg-muted/60",
              )}
            >
              {c}
            </Link>
          ) : (
            <div key={c} className={cls} title={c}>
              {c}
            </div>
          );
        })}
        {rowLabels.map((rl, ri) => {
          const rHref = rowHref?.(rl, ri);
          const rActive =
            selectedRow != null && selectedRow !== "" && rl === selectedRow;
          const rcls = cn(
            "self-center truncate text-right text-xs",
            rActive ? "font-medium text-foreground" : "text-muted-foreground",
          );
          return (
            <React.Fragment key={rl}>
              {rHref ? (
                <Link
                  href={rHref}
                  title={`Filter by ${rl}`}
                  className={cn(
                    rcls,
                    "rounded px-1 py-0.5 transition-colors hover:bg-muted/60 hover:text-foreground",
                    rActive && "bg-muted/60",
                  )}
                >
                  {rl}
                </Link>
              ) : (
                <div className={cn(rcls, "pr-2")} title={rl}>
                  {rl}
                </div>
              )}
              {colLabels.map((cl, ci) => {
                const v = matrix[ri]?.[ci] ?? 0;
                const intensity = v / max;
                const isSelected =
                  rActive &&
                  selectedCol != null &&
                  selectedCol !== "" &&
                  cl === selectedCol;
                const href = v > 0 ? cellHref?.(rl, cl, ri, ci) : undefined;
                const style: React.CSSProperties = {
                  backgroundColor: v
                    ? `rgba(26, 182, 182, ${(0.15 + 0.75 * intensity).toFixed(3)})`
                    : "transparent",
                  color: intensity > 0.55 ? "#06312f" : "inherit",
                };
                const base = cn(
                  "flex items-center justify-center rounded border text-xs font-medium tabular-nums",
                  cellHeight,
                );
                const cls = cn(
                  base,
                  isSelected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border/40",
                );
                return href ? (
                  <Link
                    key={cl}
                    href={href}
                    title={`${rl} · ${cl}: ${v} — click to filter`}
                    className={cn(
                      cls,
                      "cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/50",
                    )}
                    style={style}
                  >
                    {v || ""}
                  </Link>
                ) : (
                  <div
                    key={cl}
                    title={`${rl} · ${cl}: ${v}`}
                    className={cls}
                    style={style}
                  >
                    {v || ""}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
