"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { createDeal } from "@/lib/actions/deals";
import type { FormState } from "@/lib/actions/types";

/** "New deal" pipeline button — opens a popup to name a blank deal (#6).
 * Insert failures surface as an inline error instead of a silent redirect. */
export function NewDealButton() {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createDeal,
    {},
  );

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        New deal
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Name the deal">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-deal-title">Deal name</Label>
            <Input
              id="new-deal-title"
              name="title"
              placeholder="e.g. Soho bar acquisition — West End operator"
              required
              autoFocus
            />
          </div>
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create deal"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
