import type { Tables } from "@/lib/database.types";

// Pick (rather than the full row) so callers can narrow their `select()` to
// just these columns — e.g. the listing detail page, which only needs this
// subset to score matches.
type Requirement = Pick<
  Tables<"requirements">,
  | "target_towns"
  | "target_regions"
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

export type MatchReason = { label: string; ok: boolean };
export type MatchResult = { score: number; reasons: MatchReason[] };

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

/**
 * Score how well a disposal (supply) satisfies a requirement (demand), 0–100,
 * with per-dimension reasons. Only the criteria the requirement actually
 * specifies count toward the denominator, so an empty brief doesn't punish.
 * Budget caps treat "POA" (null) as a pass; size/covers bands need a known value.
 */
export function scoreMatch(req: Requirement, d: Disposal): MatchResult {
  const reasons: MatchReason[] = [];
  let gained = 0;
  let possible = 0;
  const add = (weight: number, applicable: boolean, ok: boolean, label: string) => {
    if (!applicable) return;
    possible += weight;
    if (ok) gained += weight;
    reasons.push({ label, ok });
  };

  const targets = [...req.target_towns, ...req.target_regions]
    .map(lc)
    .filter(Boolean);
  const place = [d.city, d.area, d.postcode, d.address_line]
    .filter(Boolean)
    .map((x) => lc(x as string))
    .join(" ");
  add(
    25,
    targets.length > 0,
    targets.some((t) => place.includes(t)),
    `Location: ${d.city ?? "—"}`,
  );

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
