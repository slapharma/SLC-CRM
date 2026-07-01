"use client";

import Link from "next/link";
import { Building2, MapPin, Store, User, type LucideIcon } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MapKind, MapPoint } from "@/components/concentration-map";

type BadgeTone = React.ComponentProps<typeof Badge>["tone"];

const KIND: Record<
  MapKind,
  { label: string; view: string; tone: BadgeTone; icon: LucideIcon; href: (id: string) => string }
> = {
  listing: {
    label: "Listing",
    view: "View listing",
    tone: "teal",
    icon: Store,
    href: (id) => `/listings/${id}`,
  },
  company: {
    label: "Company",
    view: "View company",
    tone: "slate",
    icon: Building2,
    href: (id) => `/companies/${id}`,
  },
  contact: {
    label: "Contact",
    view: "View contact",
    tone: "emerald",
    icon: User,
    href: (id) => `/contacts/${id}`,
  },
};

/** Card shown when a map pin is clicked: image (listings), name, address + a View link. */
export function PinDetailModal({
  point,
  onClose,
}: {
  point: MapPoint | null;
  onClose: () => void;
}) {
  const meta = point ? KIND[point.kind] : null;
  return (
    <Modal open={Boolean(point)} onClose={onClose} title={point?.name ?? ""}>
      {point && meta ? (
        <div className="space-y-3">
          {point.kind === "listing" && point.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={point.image}
              alt={point.name}
              className="h-40 w-full rounded-md border object-cover"
            />
          ) : null}

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
