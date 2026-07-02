// Server-side geocoding via the Google Geocoding API. Used by the contact /
// company / disposal server actions (and the backfill script) to turn a postal
// address into lat/lng. Never imported by client components — it reads the
// server-only key. Fails soft (returns null) when unconfigured or no match, so
// saving a record never breaks just because geocoding is unavailable.

import { GOOGLE_MAPS_SERVER_KEY } from "@/lib/maps/config";

export type LatLng = { lat: number; lng: number };

export type AddressParts = {
  address_line?: string | null;
  city?: string | null;
  postcode?: string | null;
};

/** Compose the address parts into a single query string (empty if no parts). */
export function addressQuery(parts: AddressParts): string {
  return [parts.address_line, parts.city, parts.postcode]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Geocode a UK address. Returns null when: no server key, no address parts, the
 * API errors, or there is no result. `region=gb` biases results to the UK.
 */
export async function geocodeAddress(
  parts: AddressParts,
  key: string = GOOGLE_MAPS_SERVER_KEY,
): Promise<LatLng | null> {
  const query = addressQuery(parts);
  if (!key || !query) return null;

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(query)}&region=gb&key=${key}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status: string;
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    if (body.status !== "OK") return null;
    const loc = body.results?.[0]?.geometry?.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") {
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/** True if any address part differs between the form and the stored record. */
export function addressChanged(a: AddressParts, b: AddressParts): boolean {
  return (
    (a.address_line ?? "") !== (b.address_line ?? "") ||
    (a.city ?? "") !== (b.city ?? "") ||
    (a.postcode ?? "") !== (b.postcode ?? "")
  );
}

type StoredGeo = AddressParts & { lat: number | null; lng: number | null };

/**
 * Decide the lat/lng to persist on save:
 *  - `{ lat: null, lng: null }` → address was cleared, so wipe stale coords.
 *  - `null` → leave coords untouched (address unchanged & already geocoded, or
 *    geocoding is unavailable / failed — never clobber good data with a failure).
 *  - `{ lat, lng }` → freshly geocoded coordinates to write.
 */
export async function geocodeForSave(
  parts: AddressParts,
  existing?: StoredGeo | null,
): Promise<LatLng | { lat: null; lng: null } | null> {
  if (!addressQuery(parts)) return { lat: null, lng: null };
  if (
    existing &&
    existing.lat != null &&
    existing.lng != null &&
    !addressChanged(parts, existing)
  ) {
    return null;
  }
  return geocodeAddress(parts);
}
