import type { Tables } from "@/lib/database.types";
import {
  deriveCounty,
  distanceMiles,
  districtCentroid,
  districtMatches,
  expandRegions,
  extractDistrict,
  getCounty,
  getTown,
  regionOfCounty,
  type LatLng,
} from "@/lib/locations";

// Pick (rather than the full row) so callers can narrow their `select()` to
// just these columns — e.g. the listing detail page, which only needs this
// subset to score matches.
type Requirement = Pick<
  Tables<"requirements">,
  | "target_towns"
  | "target_regions"
  | "target_counties"
  | "target_postcode_districts"
  | "min_sqft"
  | "max_sqft"
  | "min_covers"
  | "max_covers"
  | "use_classes"
  | "property_types"
  | "tenure_prefs"
  | "max_rent"
  | "max_premium"
  | "max_guide_price"
  | "fit_out_prefs"
>;
type Disposal = Pick<
  Tables<"disposals">,
  | "city"
  | "area"
  | "postcode"
  | "address_line"
  | "county"
  | "lat"
  | "lng"
  | "size_sqft"
  | "covers_internal"
  | "use_class"
  | "property_type"
  | "disposal_type"
  | "rent_pa"
  | "premium"
  | "guide_price"
  | "fit_out_state"
>;

export type MatchReason = { label: string; ok: boolean; partial?: boolean };
export type MatchResult = { score: number; reasons: MatchReason[] };
export type ScoreOptions = {
  /**
   * Location flexibility 0–100: how far outside the targeted locations a
   * disposal may sit and still earn partial location credit. 0 = exact
   * matches only (legacy behaviour); the search radius is (flex / 100) × 25
   * miles, with credit fading linearly to zero at the edge.
   */
  locationFlex?: number;
};

export const DEFAULT_LOCATION_FLEX = 50;
const MAX_RADIUS_MILES = 25;
/** Proximity credit is capped below 1 so a nearby miss never beats a direct hit. */
const PROXIMITY_CAP = 0.8;
/**
 * Extra search radius allowed around a COUNTY centroid. A county centroid can
 * sit 20–30 miles from its own border, so a listing "just over the line" from a
 * targeted county would otherwise never come within the town-sized radius. The
 * bonus only applies when flex > 0 (flex 0 still means exact matches only).
 */
const COUNTY_RADIUS_BONUS_MILES = 15;

const lc = (s: string) => s.toLowerCase();
const gbp = (n: number) => `£${Number(n).toLocaleString("en-GB")}`;
const num = (n: number) => Number(n).toLocaleString("en-GB");

// Requirement tenure preference -> acceptable disposal_type values.
const TENURE_MAP: Record<string, string[]> = {
  freehold: ["freehold"],
  leasehold: ["new_lease", "sublease"],
  new_letting: ["new_lease"],
  assignment: ["lease_assignment"],
};

function withinBand(
  v: number | null,
  min: number | null,
  max: number | null,
): boolean {
  if (v == null) return false;
  if (min != null && v < min) return false;
  if (max != null && v > max) return false;
  return true;
}

// Requirement use_classes are enum slugs; disposal.use_class is free text
// ("Class E", "Sui Generis", "A3"). Compare loosely.
function matchesUseClass(reqClasses: readonly string[], use: string | null): boolean {
  if (!use) return false;
  const t = lc(use);
  return reqClasses.some((rc) => {
    if (rc === "E") return t.includes("class e") || t === "e";
    if (rc.startsWith("sui_generis"))
      return t.includes("sui generis") || t.includes("sui-generis");
    return t.includes(lc(rc));
  });
}

const DISTRICT_RE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?$/;

/**
 * Collapse punctuation to single spaces and pad with a space either side, so a
 * plain `includes()` on the result is a whole-word test: " ash " is not found
 * in " ashford road ", but " st albans " is found in " 12 st. albans way ".
 * Multi-word and hyphenated targets survive ("stoke-on-trent" → "stoke on
 * trent"); the caller lowercases both sides first.
 */
function wordPad(s: string): string {
  return ` ${s.replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Whole-word containment — see {@link wordPad}. Empty targets never match. */
function containsWord(haystack: string, needle: string): boolean {
  const n = wordPad(needle);
  if (n.trim() === "") return false;
  return wordPad(haystack).includes(n);
}

type ResolvedTargets = {
  /** Lowercased free-text targets for the whole-word containment pass. */
  text: string[];
  /** Lowercased county targets (incl. Home Counties expansion). */
  counties: string[];
  /** Lowercased region targets (after Home Counties expansion). */
  regions: string[];
  /** Uppercased district codes (from the district column + district-shaped towns). */
  districts: string[];
  /**
   * Named coordinates (towns + district centroids + county centroids) for the
   * proximity pass. `bonus` widens the search radius around coarse points.
   */
  points: { name: string; at: LatLng; bonus: number }[];
  any: boolean;
};

// The matches page scores every requirement against every disposal; resolve
// each requirement's targets once, not once per pair.
const targetCache = new WeakMap<Requirement, ResolvedTargets>();

function resolveTargets(req: Requirement): ResolvedTargets {
  const cached = targetCache.get(req);
  if (cached) return cached;

  const towns = req.target_towns.filter(Boolean);
  const expanded = expandRegions(req.target_regions.filter(Boolean));
  const counties = [...req.target_counties, ...expanded.counties].filter(Boolean);
  // Legacy free-text targets like "W1" may be filed under towns — treat
  // district-shaped values as districts everywhere.
  const districts = [
    ...req.target_postcode_districts,
    ...towns.filter((t) => DISTRICT_RE.test(t.trim())),
  ].map((t) => t.trim().toUpperCase());

  const points: { name: string; at: LatLng; bonus: number }[] = [];
  for (const t of towns) {
    if (DISTRICT_RE.test(t.trim())) continue;
    const town = getTown(t);
    if (town)
      points.push({ name: town.name, at: { lat: town.lat, lng: town.lng }, bonus: 0 });
  }
  for (const code of districts) {
    const at = districtCentroid(code);
    if (at) points.push({ name: code, at, bonus: 0 });
  }
  // County targets get proximity credit too (#18): a listing a couple of miles
  // the wrong side of a county line used to score a flat zero while an
  // equivalent town brief scored ~0.7. Measured from the county centroid, so it
  // carries a wider radius (see COUNTY_RADIUS_BONUS_MILES).
  for (const c of counties) {
    const county = getCounty(c);
    if (county?.lat != null && county.lng != null) {
      points.push({
        name: county.name,
        at: { lat: county.lat, lng: county.lng },
        bonus: COUNTY_RADIUS_BONUS_MILES,
      });
    }
  }

  const resolved: ResolvedTargets = {
    text: [...towns, ...req.target_regions, ...counties].map(lc).filter(Boolean),
    counties: counties.map(lc),
    regions: expanded.regions.map(lc),
    districts,
    points,
    any:
      towns.length > 0 ||
      req.target_regions.length > 0 ||
      counties.length > 0 ||
      districts.length > 0,
  };
  targetCache.set(req, resolved);
  return resolved;
}

/** Disposal coordinates: stored lat/lng, else postcode-district centroid, else town. */
function disposalCoords(d: Disposal): LatLng | null {
  if (d.lat != null && d.lng != null) return { lat: d.lat, lng: d.lng };
  const fromDistrict = districtCentroid(extractDistrict(d.postcode));
  if (fromDistrict) return fromDistrict;
  const town = getTown(d.city);
  return town ? { lat: town.lat, lng: town.lng } : null;
}

/**
 * Location factor 0–1: 1 for a direct hit (targeted town/county/region text or
 * postcode district); otherwise, when flex > 0, partial credit fading linearly
 * with distance from the nearest targeted town, district or county centroid.
 */
function locationFactor(
  t: ResolvedTargets,
  d: Disposal,
  flex: number,
): { factor: number; label: string } {
  const place = [d.city, d.area, d.postcode, d.address_line]
    .filter(Boolean)
    .map((x) => lc(x as string))
    .join(" ");
  const fallback = `Location: ${d.city ?? "—"}`;

  // Whole-word containment, not raw substring: target "Ash" must not score a
  // direct hit on "Ashford" or "Ashley Road" (#18).
  if (t.text.some((target) => containsWord(place, target)))
    return { factor: 1, label: fallback };

  const disposalDistrict = extractDistrict(d.postcode);
  if (
    disposalDistrict &&
    t.districts.some((target) => districtMatches(target, disposalDistrict))
  ) {
    return { factor: 1, label: `Location: ${disposalDistrict}` };
  }

  const county = d.county ?? deriveCounty({ postcode: d.postcode, city: d.city });
  if (county) {
    if (t.counties.includes(lc(county)))
      return { factor: 1, label: `Location: ${county}` };
    const region = regionOfCounty(county);
    if (region && t.regions.includes(lc(region)))
      return { factor: 1, label: `Location: ${region}` };
  }

  const radius = (Math.min(Math.max(flex, 0), 100) / 100) * MAX_RADIUS_MILES;
  if (radius > 0 && t.points.length > 0) {
    const at = disposalCoords(d);
    if (at) {
      // Best = strongest credit, not merely nearest: a coarse county centroid
      // carries a wider radius, so 20 mi from a county can beat 20 mi from a
      // town (which earns nothing at all).
      let best: { name: string; dist: number; factor: number } | null = null;
      for (const p of t.points) {
        const reach = radius + p.bonus;
        const dist = distanceMiles(p.at, at);
        if (dist > reach) continue;
        const factor = PROXIMITY_CAP * (1 - dist / reach);
        if (!best || factor > best.factor) best = { name: p.name, dist, factor };
      }
      if (best) {
        return {
          factor: best.factor,
          label: `Location: ${best.dist < 0.95 ? "under a mile" : `~${Math.round(best.dist)} mi`} from ${best.name}`,
        };
      }
    }
  }

  return { factor: 0, label: fallback };
}

/**
 * Score how well a disposal (supply) satisfies a requirement (demand), 0–100,
 * with per-dimension reasons. Only the criteria the requirement actually
 * specifies count toward the denominator, so an empty brief doesn't punish.
 * Budget caps treat "POA" (null) as a pass; size/covers bands need a known value.
 */
export function scoreMatch(
  req: Requirement,
  d: Disposal,
  opts: ScoreOptions = {},
): MatchResult {
  const reasons: MatchReason[] = [];
  let gained = 0;
  let possible = 0;
  const add = (
    weight: number,
    applicable: boolean,
    okOrFactor: boolean | number,
    label: string,
  ) => {
    if (!applicable) return;
    const factor = typeof okOrFactor === "number" ? okOrFactor : okOrFactor ? 1 : 0;
    possible += weight;
    gained += weight * factor;
    reasons.push({
      label,
      ok: factor >= 0.999,
      ...(factor > 0 && factor < 0.999 ? { partial: true } : {}),
    });
  };

  const targets = resolveTargets(req);
  const loc = locationFactor(targets, d, opts.locationFlex ?? DEFAULT_LOCATION_FLEX);
  add(25, targets.any, loc.factor, loc.label);

  add(
    15,
    req.min_sqft != null || req.max_sqft != null,
    withinBand(d.size_sqft, req.min_sqft, req.max_sqft),
    `Size: ${d.size_sqft != null ? `${num(d.size_sqft)} sq ft` : "unknown"}`,
  );

  add(
    10,
    req.min_covers != null || req.max_covers != null,
    withinBand(d.covers_internal, req.min_covers, req.max_covers),
    `Covers: ${d.covers_internal != null ? d.covers_internal : "unknown"}`,
  );

  add(
    15,
    req.use_classes.length > 0,
    matchesUseClass(req.use_classes, d.use_class),
    `Use class: ${d.use_class ?? "—"}`,
  );

  add(
    10,
    req.property_types.length > 0,
    req.property_types.some(
      (p) => !!d.property_type && lc(d.property_type).includes(lc(p)),
    ),
    `Type: ${d.property_type ?? "—"}`,
  );

  add(
    10,
    req.tenure_prefs.length > 0,
    req.tenure_prefs.some((p) => (TENURE_MAP[p] ?? []).includes(d.disposal_type)),
    `Tenure: ${d.disposal_type}`,
  );

  add(
    10,
    req.max_rent != null,
    d.rent_pa == null || d.rent_pa <= (req.max_rent as number),
    `Rent: ${d.rent_pa != null ? `${gbp(d.rent_pa)} pa` : "POA"} vs max ${gbp(req.max_rent ?? 0)}`,
  );

  add(
    5,
    req.max_premium != null,
    d.premium == null || d.premium <= (req.max_premium as number),
    `Premium: ${d.premium != null ? gbp(d.premium) : "—"}`,
  );

  add(
    5,
    req.max_guide_price != null,
    d.guide_price == null || d.guide_price <= (req.max_guide_price as number),
    `Guide: ${d.guide_price != null ? gbp(d.guide_price) : "—"}`,
  );

  add(
    5,
    req.fit_out_prefs.length > 0,
    !d.fit_out_state || req.fit_out_prefs.includes(d.fit_out_state),
    `Fit-out: ${d.fit_out_state ?? "—"}`,
  );

  const score = possible > 0 ? Math.round((gained / possible) * 100) : 0;
  return { score, reasons };
}
