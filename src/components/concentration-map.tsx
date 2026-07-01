"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { GOOGLE_MAPS_BROWSER_KEY } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { PinDetailModal } from "@/components/pin-detail-modal";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type MapKind = "listing" | "company" | "contact";

export type MapPoint = {
  id: string;
  kind: MapKind;
  name: string;
  subtitle?: string | null; // status / type / role
  address?: string | null;
  image?: string | null; // listings only
  lat: number;
  lng: number;
};

export type MapLayers = {
  listings: MapPoint[];
  companies: MapPoint[];
  contacts: MapPoint[];
};

type LayerKey = keyof MapLayers;

// One colour per entity type so the layers stay distinguishable on the map.
const LAYER_META: {
  key: LayerKey;
  label: string;
  color: string;
  stroke: string;
}[] = [
  { key: "listings", label: "Listings", color: "#2bc5cb", stroke: "#1a7e82" }, // CDG blue
  { key: "companies", label: "Companies", color: "#111111", stroke: "#000000" }, // black
  { key: "contacts", label: "Contacts", color: "#16a34a", stroke: "#15803d" }, // green
];

// A teardrop map-pin marker icon (data-URI SVG) in the given colour.
const pinSvg = (color: string, stroke: string) =>
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">' +
      `<path d="M13 0C5.82 0 0 5.82 0 13c0 9.4 11.4 23 13 25 1.6-2 13-15.6 13-25C26 5.82 20.18 0 13 0Z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>` +
      '<circle cx="13" cy="13" r="4.5" fill="#ffffff"/>' +
      "</svg>",
  );

export function ConcentrationMap({ layers }: { layers: MapLayers }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerObjs = React.useRef<Partial<Record<LayerKey, any[]>>>({});
  const [failed, setFailed] = React.useState(false);
  const [selected, setSelected] = React.useState<MapPoint | null>(null);
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
        for (const { key, color, stroke } of LAYER_META) {
          const icon = {
            url: pinSvg(color, stroke),
            scaledSize: new maps.Size(26, 38),
            anchor: new maps.Point(13, 38),
          };
          const markers = layers[key].map((p) => {
            const position = { lat: p.lat, lng: p.lng };
            bounds.extend(position);
            const marker = new maps.Marker({
              position,
              map: active[key] ? map : null,
              icon,
              title: p.name,
            });
            marker.addListener("click", () => setSelected(p));
            return marker;
          });
          markerObjs.current[key] = markers;
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 64);
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

  // Toggle marker visibility per layer without rebuilding the map.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const { key } of LAYER_META) {
      for (const m of markerObjs.current[key] ?? []) {
        m.setMap(active[key] ? map : null);
      }
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
              "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        role="application"
        aria-label="Map of listings, companies and contacts across the UK"
        className="h-[32rem] w-full overflow-hidden rounded-md border"
      />
      <p className="text-xs text-muted-foreground">
        Click a pin to open its card. Toggle a layer with the buttons above.
      </p>
      <PinDetailModal point={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
