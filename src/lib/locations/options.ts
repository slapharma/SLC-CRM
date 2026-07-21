// UK location dropdown options — client-safe (names/codes only, no centroids).
//
// Contains OS data © Crown copyright and database right. Contains Royal Mail
// data © Royal Mail copyright and database right. Contains ONS data © Crown
// copyright and database right. Licensed under the Open Government Licence
// v3.0. Source CSV via doogal.co.uk. Regenerate with
// `node scripts/build-uk-locations.mjs`.

import options from "./data/uk-location-options.json";

export type LocationKind = "town" | "county" | "region" | "district";

export type LocationOption = {
  kind: LocationKind;
  /** Stored value — town/county/region name or district code. */
  value: string;
  /** Extra display context, e.g. the district's post town. */
  detail?: string;
};

export const REGION_OPTIONS: string[] = options.regions;
export const COUNTY_OPTIONS: string[] = options.counties;
export const TOWN_OPTIONS: string[] = options.towns;
export const DISTRICT_OPTIONS: [code: string, town: string][] =
  options.districts as [string, string][];

export const KIND_LABELS: Record<LocationKind, string> = {
  town: "Towns",
  county: "Counties",
  region: "Regions",
  district: "Postcode districts",
};

export function optionsForKinds(kinds: readonly LocationKind[]): LocationOption[] {
  const out: LocationOption[] = [];
  for (const kind of kinds) {
    if (kind === "town")
      for (const value of TOWN_OPTIONS) out.push({ kind, value });
    if (kind === "county")
      for (const value of COUNTY_OPTIONS) out.push({ kind, value });
    if (kind === "region")
      for (const value of REGION_OPTIONS) out.push({ kind, value });
    if (kind === "district")
      for (const [code, town] of DISTRICT_OPTIONS)
        out.push({ kind, value: code, detail: town || undefined });
  }
  return out;
}

const lcSet = (values: readonly string[]) => new Set(values.map((v) => v.toLowerCase()));
const townSet = lcSet(TOWN_OPTIONS);
const countySet = lcSet(COUNTY_OPTIONS);
const regionSet = lcSet(REGION_OPTIONS);
const districtSet = new Set(DISTRICT_OPTIONS.map(([code]) => code));

/**
 * Best-effort kind for a stored value (used to re-seed chips when editing a
 * record saved before structured locations, or typed as free text).
 */
export function classifyLocation(value: string): LocationKind | null {
  const v = value.trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (regionSet.has(lower)) return "region";
  if (countySet.has(lower)) return "county";
  if (townSet.has(lower)) return "town";
  const upper = v.toUpperCase();
  if (districtSet.has(upper) || /^[A-Z]{1,2}\d[A-Z\d]?$/.test(upper)) return "district";
  return null;
}
