// Builds a Google Maps Static API image URL — a flat PNG of a location with a
// marker. Used to embed a real map in the listing particulars PDF (the on-screen
// map uses the JS API instead). Server-only key; returns null when unconfigured.

import { GOOGLE_MAPS_SERVER_KEY } from "@/lib/maps/config";

const TEAL = "0x1ab6b6"; // CDG brand marker colour

export function staticMapUrl(
  lat: number,
  lng: number,
  {
    zoom = 14,
    width = 600,
    height = 360,
    scale = 2,
    key = GOOGLE_MAPS_SERVER_KEY,
  }: { zoom?: number; width?: number; height?: number; scale?: number; key?: string } = {},
): string | null {
  if (!key) return null;
  const center = `${lat},${lng}`;
  const params = new URLSearchParams({
    center,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: "roadmap",
    markers: `color:${TEAL}|${center}`,
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
