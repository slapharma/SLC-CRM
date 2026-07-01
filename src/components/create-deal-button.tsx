"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { createDealFromMatch } from "@/lib/actions/deals";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create deal"}
    </Button>
  );
}

/**
 * "Create a deal" from a requirement ↔ listing match. Opens a popup to name the
 * deal first (#6); the name (plus both ids) posts to the server action, which
 * de-dupes on the pair and redirects to the deal.
 */
export function CreateDealButton({
  requirementId,
  listingId,
  label = "Create deal",
  defaultTitle = "",
}: {
  requirementId: string;
  listingId: string;
  label?: string;
  defaultTitle?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Handshake />
        {label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Name the deal">
        <form action={createDealFromMatch} className="space-y-4">
          <input type="hidden" name="requirement_id" value={requirementId} />
          <input type="hidden" name="listing_id" value={listingId} />
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Deal name</Label>
            <Input
              id="deal-title"
              name="title"
              defaultValue={defaultTitle}
              placeholder="e.g. Corner bar, Soho ↔ West End operator"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-name it from the listing and enquiry.
            </p>
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
