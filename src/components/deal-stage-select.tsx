"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { dealStageBadge } from "@/lib/badges";
import { updateDealStage } from "@/lib/actions/deals";
import { cn } from "@/lib/utils";

const STAGES = [
  "lead",
  "viewing",
  "offer",
  "heads_of_terms",
  "legal",
  "completed",
  "fell_through",
] as const;

function Trigger({
  stage,
  open,
  onClick,
  ariaLabel,
}: {
  stage: string;
  open: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const { pending } = useFormStatus();
  const sb = dealStageBadge(stage);
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
 * Inline stage mover — a colour-coded popover (trigger shows the stage's own
 * Badge) instead of a bare native select. Submits via the existing narrow
 * `updateDealStage` action on selection, same as before.
 */
export function DealStageSelect({
  id,
  stage,
  className,
  "aria-label": ariaLabel = "Move deal stage",
}: {
  id: string;
  stage: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const stageFieldRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(next: string) {
    // Closing stages have side effects (requirement satisfied, listing status)
    // and a misclick is easy — ask first.
    if (next !== stage && (next === "completed" || next === "fell_through")) {
      const label = dealStageBadge(next).label;
      const ok = window.confirm(
        next === "completed"
          ? `Mark this deal as ${label}? Its linked requirement will be marked satisfied and the listing updated.`
          : `Mark this deal as ${label}?`,
      );
      if (!ok) {
        setOpen(false);
        return;
      }
    }
    if (stageFieldRef.current) stageFieldRef.current.value = next;
    setOpen(false);
    formRef.current?.requestSubmit();
  }

  return (
    <form
      action={updateDealStage}
      ref={formRef}
      className={cn("relative inline-block", className)}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" ref={stageFieldRef} defaultValue={stage} />
      <Trigger
        stage={stage}
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
            className="absolute left-0 z-50 mt-1 w-44 space-y-0.5 rounded-md border bg-card p-1 shadow-md"
          >
            {STAGES.map((s) => {
              const sb = dealStageBadge(s);
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={s === stage}
                    onClick={() => choose(s)}
                    className={cn(
                      "flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      s === stage && "bg-muted/40",
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
