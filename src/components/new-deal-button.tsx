"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { createDeal } from "@/lib/actions/deals";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create deal"}
    </Button>
  );
}

/** "New deal" pipeline button — opens a popup to name a blank deal (#6). */
export function NewDealButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        New deal
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Name the deal">
        <form action={createDeal} className="space-y-4">
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
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Submit />
          </div>
        </form>
      </Modal>
    </>
  );
}
