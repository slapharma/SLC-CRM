// Idempotent client-side loader for the Google Maps JavaScript API. Injects the
// <script> exactly once (even across multiple map components on a page) and
// resolves to the `google.maps` namespace. We keep the maps types loose (`any`)
// to avoid pulling in @types/google.maps — the app ships no other chart/maps dep.

/* eslint-disable @typescript-eslint/no-explicit-any */
type GoogleMaps = any;

declare global {
  interface Window {
    google?: { maps?: GoogleMaps };
    __onGoogleMapsReady?: () => void;
  }
}

let loaderPromise: Promise<GoogleMaps> | null = null;

/**
 * Load the Maps JS API. Core classes (Map, Marker) need no extra library, so we
 * request none. Returns a cached promise so concurrent callers share one network
 * request.
 */
export function loadGoogleMaps(
  apiKey: string,
  libraries: string[] = [],
): Promise<GoogleMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<GoogleMaps>((resolve, reject) => {
    window.__onGoogleMapsReady = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Google Maps loaded without a maps namespace."));
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      callback: "__onGoogleMapsReady",
      loading: "async",
      v: "weekly",
    });
    if (libraries.length) params.set("libraries", libraries.join(","));
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load the Google Maps script."));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}
