"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { MapPinPreviewModal } from "@/components/map-pin-preview-modal";
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/components/concentration-map";

/** Small text link for a table row: opens a modal with that record's pin on a map. */
export function ViewOnMapButton({
  point,
  className,
}: {
  point: MapPoint;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <MapPin className="h-3 w-3" />
        View on map
      </button>
      <MapPinPreviewModal point={open ? point : null} onClose={() => setOpen(false)} />
    </>
  );
}
