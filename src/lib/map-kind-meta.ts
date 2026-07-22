import { Building2, Store, User, type LucideIcon } from "lucide-react";

import type { Badge } from "@/components/ui/badge";
import type { MapKind } from "@/components/concentration-map";

type BadgeTone = React.ComponentProps<typeof Badge>["tone"];

/** Shared display metadata for a map pin's kind — used by any modal that shows a pin's details. */
export const MAP_KIND_META: Record<
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
