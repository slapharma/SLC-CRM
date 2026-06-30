import * as React from "react";

/**
 * A density heatmap: rowLabels × colLabels grid, each cell shaded by its count
 * relative to the busiest cell. Server-rendered (CSS grid, no chart dep).
 */
export function Heatmap({
  rowLabels,
  colLabels,
  matrix,
  empty = "Not enough data to chart yet.",
}: {
  rowLabels: string[];
  colLabels: string[];
  matrix: number[][];
  empty?: string;
}) {
  if (rowLabels.length === 0 || colLabels.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(1, ...matrix.flat());

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{
          gridTemplateColumns: `minmax(7rem, auto) repeat(${colLabels.length}, minmax(3.5rem, 1fr))`,
        }}
      >
        <div />
        {colLabels.map((c) => (
          <div
            key={c}
            className="truncate px-1 pb-1 text-center text-[11px] font-medium text-muted-foreground"
            title={c}
          >
            {c}
          </div>
        ))}
        {rowLabels.map((rl, ri) => (
          <React.Fragment key={rl}>
            <div
              className="self-center truncate pr-2 text-right text-xs text-muted-foreground"
              title={rl}
            >
              {rl}
            </div>
            {colLabels.map((cl, ci) => {
              const v = matrix[ri]?.[ci] ?? 0;
              const intensity = v / max;
              return (
                <div
                  key={cl}
                  title={`${rl} · ${cl}: ${v}`}
                  className="flex h-9 items-center justify-center rounded border border-border/40 text-xs font-medium tabular-nums"
                  style={{
                    backgroundColor: v
                      ? `rgba(26, 182, 182, ${(0.15 + 0.75 * intensity).toFixed(3)})`
                      : "transparent",
                    color: intensity > 0.55 ? "#06312f" : "inherit",
                  }}
                >
                  {v || ""}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
