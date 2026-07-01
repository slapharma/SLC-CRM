import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string | null;
  href?: string;
};

const COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

/**
 * Compact KPI "stats bar" — the dashboard's metric-card look (uppercase label,
 * big mono number, icon chip) as a reusable row. Optional `href` makes a tile a
 * link with hover feedback.
 */
export function StatsBar({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("grid gap-3", COLS[stats.length] ?? COLS[4], className)}>
      {stats.map((s) => {
        const Icon = s.icon;
        const value =
          typeof s.value === "number" ? s.value.toLocaleString("en-GB") : s.value;
        const inner = (
          <Card
            className={cn(
              "h-full",
              s.href && "transition-all hover:border-primary/40 hover:shadow-md",
            )}
          >
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                  {value}
                </p>
                {s.hint ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.hint}</p>
                ) : null}
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
        return s.href ? (
          <Link
            key={s.label}
            href={s.href}
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {inner}
          </Link>
        ) : (
          <div key={s.label}>{inner}</div>
        );
      })}
    </div>
  );
}
