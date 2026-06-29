"use client";

import { useActionState } from "react";

import { AgentFields } from "@/components/agent-fields";
import { Button } from "@/components/ui/button";
import { updateDisposalAssignment } from "@/lib/actions/disposals";
import type { FormState } from "@/lib/actions/types";
import type { AgentOption } from "@/lib/supabase/agency";

export function DisposalAssignmentForm({
  disposalId,
  agents,
  leadAgentId,
  additionalAgentIds,
}: {
  disposalId: string;
  agents: AgentOption[];
  leadAgentId: string | null;
  additionalAgentIds: string[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateDisposalAssignment,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={disposalId} />
      <AgentFields
        agents={agents}
        leadAgentId={leadAgentId}
        additionalAgentIds={additionalAgentIds}
      />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save assignment"}
      </Button>
    </form>
  );
}
