"use client";

import * as React from "react";
import { MapPin } from "lucide-react";

import { GOOGLE_MAPS_BROWSER_KEY } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type GeoPoint = { lat: number; lng: number };
export type MapLayers = {
  listings: GeoPoint[];
  companies: GeoPoint[];
  contacts: GeoPoint[];
};

type LayerKey = keyof MapLayers;

const LAYER_META: { key: LayerKey; label: string }[] = [
  { key: "listings", label: "Listings" },
  { key: "companies", label: "Companies" },
  { key: "contacts", label: "Contacts" },
];

// CDG logo blue — every pin uses the brand colour (see public/cdg-logo.svg).
const PIN_COLOR = "#2bc5cb";
const PIN_STROKE = "#1a7e82";

// A teardrop map-pin marker icon (data-URI SVG) in the brand colour.
const PIN_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">' +
      `<path d="M13 0C5.82 0 0 5.82 0 13c0 9.4 11.4 23 13 25 1.6-2 13-15.6 13-25C26 5.82 20.18 0 13 0Z" fill="${PIN_COLOR}" stroke="${PIN_STROKE}" stroke-width="1.5"/>` +
      '<circle cx="13" cy="13" r="4.5" fill="#ffffff"/>' +
      "</svg>",
  );

export function ConcentrationMap({ layers }: { layers: MapLayers }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);
  const markerObjs = React.useRef<Partial<Record<LayerKey, any[]>>>({});
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

        const icon = {
          url: PIN_SVG,
          scaledSize: new maps.Size(26, 38),
          anchor: new maps.Point(13, 38),
        };

        const bounds = new maps.LatLngBounds();
        for (const { key, label } of LAYER_META) {
          const markers = layers[key].map((p) => {
            const position = { lat: p.lat, lng: p.lng };
            bounds.extend(position);
            return new maps.Marker({
              position,
              map: active[key] ? map : null,
              icon,
              title: label,
            });
          });
          markerObjs.current[key] = markers;
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
        {LAYER_META.map(({ key, label }) => (
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
            <MapPin
              className="h-3.5 w-3.5"
              style={{ color: PIN_COLOR }}
              aria-hidden
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
        aria-label="Map of listings, companies and contacts across the UK"
        className="h-[32rem] w-full overflow-hidden rounded-md border"
      />
      <p className="text-xs text-muted-foreground">
        Each pin marks a geocoded record. Toggle a layer with the buttons above.
      </p>
    </div>
  );
}
