// Centralised Google Maps env access. Mirrors lib/supabase/config.ts: every maps
// feature reads from here and fails soft when the key is absent, so the app keeps
// working (with placeholders) before the keys are set in Vercel.

/** Browser key — loads the Maps JavaScript API + heatmap/marker layers. Safe to
 *  expose (restrict it by HTTP referrer in Google Cloud). */
export const GOOGLE_MAPS_BROWSER_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Server key — Geocoding API (address → lat/lng) + Static Maps API (PDF image).
 *  Server-only; NEVER prefix with NEXT_PUBLIC. */
export const GOOGLE_MAPS_SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY ?? "";

/** True once the public browser key is present (gates on-screen maps). */
export const isMapsBrowserConfigured = Boolean(GOOGLE_MAPS_BROWSER_KEY);

/** True once the server key is present (gates geocoding + PDF static map). */
export const isMapsServerConfigured = Boolean(GOOGLE_MAPS_SERVER_KEY);
