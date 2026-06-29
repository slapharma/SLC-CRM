"use client";

import { useRef } from "react";

import { Select } from "@/components/ui/select";
import { updateDealStage } from "@/lib/actions/deals";

const STAGES: { value: string; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "viewing", label: "Viewing" },
  { value: "offer", label: "Offer" },
  { value: "heads_of_terms", label: "Heads of Terms" },
  { value: "legal", label: "Legal" },
  { value: "completed", label: "Completed" },
  { value: "fell_through", label: "Fell through" },
];

/**
 * Inline stage mover — a native select that submits a stage change on change
 * (no drag-and-drop dependency). Used on board cards and the deal detail page.
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
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={updateDealStage} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <Select
        name="stage"
        defaultValue={stage}
        aria-label={ariaLabel}
        className={className}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
