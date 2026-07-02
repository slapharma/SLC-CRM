"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A Card whose body collapses behind a clickable header (title + description +
 * chevron). Optional `action` sits at the top-right and does not toggle the
 * panel. Used to fold the Admin panels into a tidy accordion.
 */
export function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Card>
      <div className="flex items-center gap-2 px-6 py-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
          <div className="min-w-0">
            <p className="font-semibold leading-none tracking-tight">{title}</p>
            {description ? (
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open ? <CardContent className="pt-0">{children}</CardContent> : null}
    </Card>
  );
}
