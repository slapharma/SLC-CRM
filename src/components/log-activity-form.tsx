"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="w-32 shrink-0 space-y-1">
          <Label htmlFor="activity-type" className="text-xs text-muted-foreground">
            Type
          </Label>
          <Select id="activity-type" name="type" defaultValue="note">
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="activity-subject" className="text-xs text-muted-foreground">
            Subject
          </Label>
          <Input id="activity-subject" name="subject" placeholder="Subject…" />
        </div>
        <div className="w-40 shrink-0 space-y-1">
          <Label htmlFor="activity-date" className="text-xs text-muted-foreground">
            Date
          </Label>
          <Input
            id="activity-date"
            name="occurred_on"
            type="date"
            title="Date — leave blank for today"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="activity-body" className="text-xs text-muted-foreground">
          Note
        </Label>
        <Textarea id="activity-body" name="body" placeholder="Add a note…" rows={2} />
      </div>
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
