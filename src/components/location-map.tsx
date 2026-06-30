"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { GOOGLE_MAPS_BROWSER_KEY } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { cn } from "@/lib/utils";

/**
 * A small single-marker map for one location. Renders an informative placeholder
 * (never a broken map) when the browser API key is missing or the script fails.
 * Callers should only mount this when the record actually has lat/lng.
 */
export function LocationMap({
  lat,
  lng,
  label,
  zoom = 15,
  className,
}: {
  lat: number;
  lng: number;
  label?: string;
  zoom?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!GOOGLE_MAPS_BROWSER_KEY || !ref.current) return;
    let cancelled = false;

    loadGoogleMaps(GOOGLE_MAPS_BROWSER_KEY)
      .then((maps) => {
        if (cancelled || !ref.current) return;
        const center = { lat, lng };
        const map = new maps.Map(ref.current, {
          center,
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "cooperative",
        });
        new maps.Marker({ position: center, map, title: label });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, label, zoom]);

  if (!GOOGLE_MAPS_BROWSER_KEY || failed) {
    return (
      <div
        className={cn(
          "flex h-48 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 text-center",
          className,
        )}
      >
        <MapPin className="h-6 w-6 text-muted-foreground" />
        <p className="px-4 text-sm text-muted-foreground">
          {failed
            ? "Map could not be loaded."
            : "Map unavailable — add a Google Maps API key."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label ? `Map showing ${label}` : "Location map"}
      className={cn("h-48 w-full overflow-hidden rounded-md border", className)}
    />
  );
}
