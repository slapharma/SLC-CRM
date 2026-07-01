"use client";

import * as React from "react";
import { useActionState } from "react";
import { PenSquare } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/actions/messages";
import type { FormState } from "@/lib/actions/types";
import type { AgentOption } from "@/lib/supabase/agency";

/**
 * "New message" — compose a standalone message to one or more teammates straight
 * from My Messages. Reuses the `sendMessage` action (no `link`, so the recipient's
 * notification points back at /messages).
 */
export function ComposeMessage({
  agents,
  meId,
}: {
  agents: AgentOption[];
  meId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    sendMessage,
    {},
  );
  const recipients = agents.filter((a) => a.id !== meId);

  // Auto-close shortly after a successful send.
  React.useEffect(() => {
    if (!state.message) return;
    const t = setTimeout(() => setOpen(false), 900);
    return () => clearTimeout(t);
  }, [state.message]);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <PenSquare />
        New message
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="New message">
        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No teammates to message yet — add agents in Admin.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="grid max-h-40 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                {recipients.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      name="recipients"
                      value={a.id}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    <span className="truncate">{a.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-subject">Subject</Label>
              <Input
                id="compose-subject"
                name="subject"
                placeholder="Optional subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="compose-body">Message</Label>
              <Textarea
                id="compose-body"
                name="body"
                required
                placeholder="Write a message to your team…"
              />
            </div>

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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
