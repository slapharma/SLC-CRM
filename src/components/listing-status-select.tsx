"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { listingStatusBadge } from "@/lib/badges";
import { updateDisposalStatus } from "@/lib/actions/disposals";
import { cn } from "@/lib/utils";

// Client-side copy of the canonical five (the "use server" actions module may
// only export async functions). Scraped rows can carry other free-text
// statuses — the trigger still renders those, the menu offers these.
const STATUSES = ["Available", "Under Offer", "Let", "Sold", "Withdrawn"] as const;

function Trigger({
  status,
  open,
  onClick,
  ariaLabel,
}: {
  status: string | null;
  open: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  const sb = listingStatusBadge(status);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Badge tone={sb.tone}>{sb.label}</Badge>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

/**
 * One-click listing status mover — colour-coded popover modelled on
 * DealStageSelect. Submits the narrow `updateDisposalStatus` action, so
 * "Available → Under Offer" no longer needs the full edit form.
 */
export function ListingStatusSelect({
  id,
  status,
  className,
  "aria-label": ariaLabel = "Change listing status",
}: {
  id: string;
  status: string | null;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const statusFieldRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(next: string) {
    setOpen(false);
    if (next === status) return;
    if (statusFieldRef.current) statusFieldRef.current.value = next;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      action={updateDisposalStatus}
      ref={formRef}
      className={cn("relative inline-block", className)}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" ref={statusFieldRef} defaultValue={status ?? ""} />
      <Trigger
        status={status}
        open={open}
        onClick={() => setOpen((o) => !o)}
        ariaLabel={ariaLabel}
      />
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="absolute left-0 z-50 mt-1 w-40 space-y-0.5 rounded-md border bg-card p-1 shadow-md"
          >
            {STATUSES.map((s) => {
              const sb = listingStatusBadge(s);
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={s === status}
                    onClick={() => choose(s)}
                    className={cn(
                      "flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      s === status && "bg-muted/40",
                    )}
                  >
                    <Badge tone={sb.tone}>{sb.label}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </form>
  );
}
