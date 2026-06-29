"use client";

import { useFormStatus } from "react-dom";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDealFromMatch } from "@/lib/actions/deals";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="sm" disabled={pending}>
      <Handshake />
      {pending ? "Creating…" : label}
    </Button>
  );
}

/**
 * One-click "create a deal" from a requirement ↔ listing match. Posts both ids
 * to the server action, which de-dupes and redirects to the deal.
 */
export function CreateDealButton({
  requirementId,
  listingId,
  label = "Create deal",
}: {
  requirementId: string;
  listingId: string;
  label?: string;
}) {
  return (
    <form action={createDealFromMatch}>
      <input type="hidden" name="requirement_id" value={requirementId} />
      <input type="hidden" name="listing_id" value={listingId} />
      <Submit label={label} />
    </form>
  );
}
