"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { MapKind, MapLayers } from "@/components/concentration-map";

// Google Maps is a ~1.5MB script the real component injects on mount, plus its
// own marker/clustering client JS. Deferred out of the initial bundle for every
// page that renders a map — ssr: false requires this to live in a Client
// Component, so the (server) pages import this wrapper instead of the map directly.
const LazyCompact = dynamic(
  () => import("./concentration-map").then((m) => m.ConcentrationMap),
  { ssr: false, loading: () => <Skeleton className="h-[22rem] w-full" /> },
);
const LazyFull = dynamic(
  () => import("./concentration-map").then((m) => m.ConcentrationMap),
  { ssr: false, loading: () => <Skeleton className="h-[32rem] w-full" /> },
);

export function ConcentrationMap(props: {
  layers: MapLayers;
  defaultActive?: MapKind;
  compact?: boolean;
  hideToggles?: boolean;
}) {
  return props.compact ? <LazyCompact {...props} /> : <LazyFull {...props} />;
}
