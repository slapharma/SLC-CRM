"use client";

import * as React from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Big glassy toggle that shows/hides the Portfolio Spread + Location heat-map
 * pair beneath it. Both cards collapse together behind one control so the
 * list page can be decluttered with a single click.
 */
export function ExpandableInsights({
  label = "portfolio insights",
  defaultOpen = true,
  children,
}: {
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-5 py-3.5 text-left shadow-sm backdrop-blur-md transition-all duration-200 cursor-pointer",
          "hover:bg-white/85 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15",
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold capitalize text-foreground">
            {open ? `Hide ${label}` : `Show ${label}`}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div> : null}
    </div>
  );
}
