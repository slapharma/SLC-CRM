"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logActivity } from "@/lib/actions/activities";
import type { FormState } from "@/lib/actions/types";

const TYPES = [
  ["note", "Note"],
  ["call", "Call"],
  ["email", "Email"],
  ["viewing", "Viewing"],
  ["meeting", "Meeting"],
  ["task", "Task"],
] as const;

export function LogActivityForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    logActivity,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />
      <div className="flex gap-2">
        <Select
          name="type"
          defaultValue="note"
          aria-label="Activity type"
          className="w-32 shrink-0"
        >
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input name="subject" placeholder="Subject…" aria-label="Subject" />
      </div>
      <Textarea name="body" placeholder="Add a note…" rows={2} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Logging…" : "Log activity"}
        </Button>
        {state.error ? (
          <span className="text-xs text-destructive">{state.error}</span>
        ) : null}
        {state.message ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
