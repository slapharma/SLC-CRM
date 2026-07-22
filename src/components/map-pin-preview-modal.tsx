"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";

import { ConcentrationMap } from "@/components/concentration-map-lazy";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { MAP_KIND_META } from "@/lib/map-kind-meta";
import { cn } from "@/lib/utils";
import type { MapPoint } from "@/components/concentration-map";

/** Modal opened from a "View on map" link in a table row: a single-pin map + the record's details. */
export function MapPinPreviewModal({
  point,
  onClose,
}: {
  point: MapPoint | null;
  onClose: () => void;
}) {
  const meta = point ? MAP_KIND_META[point.kind] : null;

  return (
    <Modal open={Boolean(point)} onClose={onClose} title={point?.name ?? ""}>
      {point && meta ? (
        <div className="space-y-3">
          <ConcentrationMap
            layers={{
              listings: point.kind === "listing" ? [point] : [],
              companies: point.kind === "company" ? [point] : [],
              contacts: point.kind === "contact" ? [point] : [],
            }}
            defaultActive={point.kind}
            compact
            hideToggles
            interactive={false}
          />

          <div className="flex items-center gap-2">
            <Badge tone={meta.tone}>
              <meta.icon className="h-3 w-3" />
              {meta.label}
            </Badge>
            {point.subtitle ? (
              <span className="text-sm capitalize text-muted-foreground">
                {point.subtitle.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>

          {point.address ? (
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{point.address}</span>
            </p>
          ) : null}

          <div className="flex justify-end pt-1">
            <Link
              href={meta.href(point.id)}
              onClick={onClose}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {meta.view}
            </Link>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
