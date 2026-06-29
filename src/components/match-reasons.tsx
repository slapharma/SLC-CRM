import { Check, X } from "lucide-react";

import type { MatchReason } from "@/lib/matching/score";
import { cn } from "@/lib/utils";

export function MatchReasons({ reasons }: { reasons: MatchReason[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {reasons.map((r, i) => (
        <li
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
            r.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
          )}
        >
          {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}
