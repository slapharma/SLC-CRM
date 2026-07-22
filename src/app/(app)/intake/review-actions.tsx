"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { approveSubmission, rejectSubmission } from "./actions";
import type { FormState } from "@/lib/actions/types";

/**
 * Approve / Reject buttons for one pending submission. Two forms, two action
 * states — whichever ran last reports inline, so a failed approval is visible
 * instead of silently redirecting.
 */
export function ReviewActions({ id }: { id: string }) {
  const [approveState, approve, approving] = useActionState<FormState, FormData>(
    approveSubmission,
    {},
  );
  const [rejectState, reject, rejecting] = useActionState<FormState, FormData>(
    rejectSubmission,
    {},
  );
  const state: FormState =
    approveState.error || approveState.message ? approveState : rejectState;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={approve}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" size="sm" disabled={approving || rejecting}>
            <Check />
            {approving ? "Approving…" : "Approve"}
          </Button>
        </form>
        <form action={reject}>
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={approving || rejecting}
          >
            <X />
            {rejecting ? "Rejecting…" : "Reject"}
          </Button>
        </form>
      </div>
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
    </div>
  );
}
