"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { GOOGLE_MAPS_BROWSER_KEY } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { createHeatmapOverlay } from "@/lib/maps/heatmap-overlay";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GeoPoint = { lat: number; lng: number };
export type MapLayers = {
  listings: GeoPoint[];
  companies: GeoPoint[];
  contacts: GeoPoint[];
};

type LayerKey = keyof MapLayers;

// One single-hue ramp per entity so overlapping layers stay distinguishable.
const LAYER_META: { key: LayerKey; label: string; color: string; rgb: string }[] = [
  { key: "listings", label: "Listings", color: "#1ab6b6", rgb: "26,182,182" },
  { key: "companies", label: "Companies", color: "#f59e0b", rgb: "245,158,11" },
  { key: "contacts", label: "Contacts", color: "#7c3aed", rgb: "124,58,237" },
];

export function ConcentrationMap({ layers }: { layers: MapLayers }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const layerObjs = React.useRef<Partial<Record<LayerKey, any>>>({});
  const [failed, setFailed] = React.useState(false);
  const [active, setActive] = React.useState<Record<LayerKey, boolean>>({
    listings: true,
    companies: true,
    contacts: true,
  });

  const counts: Record<LayerKey, number> = {
    listings: layers.listings.length,
    companies: layers.companies.length,
    contacts: layers.contacts.length,
  };
  const total = counts.listings + counts.companies + counts.contacts;

  React.useEffect(() => {
    if (!GOOGLE_MAPS_BROWSER_KEY || !ref.current || total === 0) return;
    let cancelled = false;

    loadGoogleMaps(GOOGLE_MAPS_BROWSER_KEY)
      .then((maps) => {
        if (cancelled || !ref.current) return;
        const map = new maps.Map(ref.current, {
          center: { lat: 54, lng: -2 }, // UK
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const bounds = new maps.LatLngBounds();
        for (const { key, rgb } of LAYER_META) {
          for (const p of layers[key]) {
            bounds.extend(new maps.LatLng(p.lat, p.lng));
          }
          const layer = createHeatmapOverlay(maps, layers[key], rgb, 30);
          layer.setMap(active[key] ? map : null);
          layerObjs.current[key] = layer;
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 64);
          // Clamp over-zoom when the data collapses to a single point.
          maps.event.addListenerOnce(map, "idle", () => {
            if (map.getZoom() > 15) map.setZoom(15);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
    // active is intentionally excluded — visibility is applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, total]);

  // Toggle layer visibility without rebuilding the map.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { key } of LAYER_META) {
      layerObjs.current[key]?.setMap(active[key] ? map : null);
    }
  }, [active]);

  if (!GOOGLE_MAPS_BROWSER_KEY || failed || total === 0) {
    return (
      <div className="flex h-[32rem] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 text-center">
        <MapPin className="h-7 w-7 text-muted-foreground" />
        <p className="px-6 text-sm text-muted-foreground">
          {!GOOGLE_MAPS_BROWSER_KEY
            ? "Map unavailable — add a Google Maps API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)."
            : failed
              ? "The map could not be loaded."
              : "No geocoded records yet. Add an address to a listing, company or contact to see it here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {LAYER_META.map(({ key, label, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive((a) => ({ ...a, [key]: !a[key] }))}
            aria-pressed={active[key]}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active[key]
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground opacity-60 hover:bg-muted/40",
            )}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {counts[key]}
            </span>
          </button>
        ))}
      </div>
      <div
        ref={ref}
        role="img"
        aria-label="Heatmap of listings, companies and contacts across the UK"
        className="h-[32rem] w-full overflow-hidden rounded-md border"
      />
      <p className="text-xs text-muted-foreground">
        Warmer areas show where records are most concentrated. Toggle a layer with
        the buttons above.
      </p>
    </div>
  );
}
