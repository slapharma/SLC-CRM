/**
 * CDG Leisure → `disposals` extractor.
 *
 * CDG Leisure (cdgleisure.com) runs on the **Agents' Society** property platform.
 * Every property page embeds its full record as a single JSON object, passed as the
 * second argument to a `AI.mapBox.init('<token>', [ {…} ], 'map')` call in the page
 * HTML. We parse that object directly rather than scraping the rendered DOM — it is
 * the platform's own data model and is far more stable than CSS/table structure.
 *
 * This module is intentionally free of Next.js and Supabase imports so it can run in
 * any runtime (route handler, server action, edge, or a plain `node script.ts`).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw shape (subset of the Agents' Society record we rely on; fields stay optional
// because the platform omits/empties many of them per listing).
// ─────────────────────────────────────────────────────────────────────────────

export interface CdgMarketingSection {
  title: string;
  key: string | null;
  content: string;
}

export interface CdgUser {
  forename?: string | null;
  surname?: string | null;
  email?: string | null;
  tel?: string | null;
  mobile?: string | null;
  position?: string | null;
  department?: string | null;
  photo?: string | null;
  perm_photo?: string | null;
}

export interface CdgFloorRow {
  name?: string;
  sizeSqFt?: string;
  sizeSqM?: string;
}

export interface CdgImage {
  src?: string;
  alt?: string | null;
}

/** The Agents' Society property record (only the fields we read are typed). */
export interface CdgRawProperty {
  id?: number;
  source_id?: number | string;
  meta_id?: number | string;
  status?: string;
  pretty_url?: string;
  name?: string;
  address1?: string;
  address_string?: string;
  postcode?: string;
  town?: string;
  lat?: number;
  lng?: number;
  users?: CdgUser[];
  size?: string;
  size_to?: number;
  premium?: string;
  price?: string;
  rent?: string;
  leasehold?: string;
  summary?: string;
  key_points?: { key_point: string }[];
  building_types?: string;
  to_let?: number | boolean;
  for_sale?: number | boolean;
  availabilities?: string;
  availability_types?: string;
  description?: string;
  location?: string;
  marketing?: Record<string, CdgMarketingSection>;
  floor_units?: {
    published?: boolean;
    description?: string;
    rows?: CdgFloorRow[];
    totals?: string[]; // ["Total", sqft, sqm]
  };
  rateable_value?: string;
  business_rates?: string;
  service_charge?: string;
  estate_charge?: string;
  parking_charge?: string;
  vat?: string;
  epc?: string;
  epc_potential?: string;
  particulars_url?: string;
  marketing_brochure?: string;
  images?: CdgImage[];
  updated_at?: string;
  seo_title?: string;
  seo_description?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapped row — the insert-ready `disposals` shape (1:1 with the Listing (Unit)
// model in tasks/todo.md). All derived numerics are nullable: the source frequently
// says "Upon enquiry" / leaves a field blank, and we never invent a value.
// ─────────────────────────────────────────────────────────────────────────────

export type DisposalType =
  | "freehold"
  | "new_lease"
  | "lease_assignment"
  | "sublease"
  | "unknown";

export type PriceQualifier =
  | "fixed"
  | "offers_in_region"
  | "offers_in_excess"
  | "on_application"
  | null;

export type FitOutState = "fully_fitted" | "part_fitted" | "shell" | null;

export interface DisposalInsert {
  // provenance
  source: string; // "cdg" | "lewiscraig" | future intel sources
  source_ref: string | null; // CDG/Agents' Society reference, e.g. "378436"
  source_url: string;
  status: string | null; // "Available" | "Under Offer" | ...
  source_updated_at: string | null;

  // identity / location
  title: string | null;
  summary: string | null;
  address_line: string | null;
  area: string | null; // e.g. "West Hampstead" (best-effort from copy)
  city: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;

  // classification
  property_type: string | null; // "Restaurant"
  use_class: string | null; // "Class E"
  disposal_type: DisposalType; // derived from availability + sale/let flags
  to_let: boolean;
  for_sale: boolean;

  // commercials
  rent_pa: number | null;
  rent_raw: string | null;
  rent_period: string | null; // "per annum"
  premium: number | null;
  premium_raw: string | null;
  guide_price: number | null; // freehold sale price
  price_qualifier: PriceQualifier;
  vat_applicable: boolean | null;
  rateable_value: number | null;
  business_rates: number | null;
  service_charge: number | null;
  estate_charge: number | null;
  parking_charge: number | null;

  // lease (null for freeholds)
  tenure_raw: string | null;
  lease_term_years: number | null;
  lease_expiry: string | null; // ISO date (1st of month when only month known)
  rent_review_basis: string | null; // "4 yearly"
  next_rent_review: number | null; // year
  inside_1954_act: boolean | null;

  // size / capacity
  size_sqft: number | null;
  size_sqm: number | null;
  covers_internal: number | null;
  covers_external: number | null;
  floors: { name: string; sqft: number | null; sqm: number | null }[];

  // leisure specifics
  licensing_notes: string | null;
  fit_out_state: FitOutState;
  epc_rating: string | null;

  // content
  description: string | null;
  location_description: string | null;
  key_features: string[];
  /** Lossless copy of every marketing block, so nothing is dropped on import. */
  sections: { title: string; content: string }[];

  // agent
  agent_name: string | null;
  agent_email: string | null;
  agent_phone: string | null;
  agent_photo: string | null;

  // media. `url` is what the CRM displays (rewritten to Storage after re-hosting);
  // `source_url` preserves the original CDG/imgix URL for provenance.
  images: { url: string; alt: string | null; source_url?: string | null }[];
  brochure_url: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraction — carve the JSON array out of the AI.mapBox.init(...) call.
// ─────────────────────────────────────────────────────────────────────────────

const INIT_MARKER = "AI.mapBox.init(";

/**
 * Scans `html` for the `AI.mapBox.init('token', [ … ], 'map')` call and returns the
 * parsed array (string-aware bracket matching, so brackets inside marketing copy or
 * URLs don't break it). Throws if the data island can't be found/parsed.
 */
export function extractCdgRecords(html: string): CdgRawProperty[] {
  const markerAt = html.indexOf(INIT_MARKER);
  if (markerAt === -1) {
    throw new CdgExtractError(
      "Data island not found (no AI.mapBox.init call). The page may have changed, " +
        "be region-blocked, or not be an Agents' Society property page.",
    );
  }

  // First '[' after the marker begins the array argument. The first argument is a
  // single-quoted token that contains no '[', so this is unambiguous.
  const arrayStart = html.indexOf("[", markerAt + INIT_MARKER.length);
  if (arrayStart === -1) {
    throw new CdgExtractError("Found AI.mapBox.init( but no array argument followed it.");
  }

  const arrayText = sliceBalanced(html, arrayStart);
  let parsed: unknown;
  try {
    parsed = JSON.parse(arrayText);
  } catch (err) {
    throw new CdgExtractError(
      `Failed to JSON.parse the data island: ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new CdgExtractError("Data island parsed but was not an array.");
  }
  return parsed as CdgRawProperty[];
}

/** Returns the first property record from the page (the page's primary listing). */
export function extractCdgProperty(html: string): CdgRawProperty {
  const records = extractCdgRecords(html);
  if (records.length === 0) {
    throw new CdgExtractError("Data island was an empty array — no property record.");
  }
  return records[0];
}

export class CdgExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CdgExtractError";
  }
}

/**
 * From an opening `[` or `{`, return the substring up to and including its matching
 * close, respecting JSON string literals and escapes.
 */
function sliceBalanced(s: string, openIndex: number): string {
  const open = s[openIndex];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(openIndex, i + 1);
    }
  }
  throw new CdgExtractError("Unbalanced brackets while reading the data island.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Field-level parsers (small, pure, individually testable).
// ─────────────────────────────────────────────────────────────────────────────

/** "£95,000" / "£50,000 per annum" / "1,250,000" → 95000 / 50000 / 1250000. */
export function parseMoney(input: string | null | undefined): number | null {
  if (!input) return null;
  const match = input.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Pulls a rent period phrase, e.g. "per annum" / "pa" / "per week". */
export function parseRentPeriod(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.match(/per\s+(?:annum|week|month|sq\s*ft)|p\.?a\.?|pcm|pw/i);
  return m ? m[0].trim() : null;
}

/** Detects the pricing qualifier from marketing copy ("offers in the region of …"). */
export function parsePriceQualifier(...texts: (string | null | undefined)[]): PriceQualifier {
  const blob = texts.filter(Boolean).join(" ").toLowerCase();
  if (!blob) return null;
  if (/on\s+application|upon\s+(?:request|enquiry)|\boia\b/.test(blob)) return "on_application";
  if (/offers?\s+in\s+(?:the\s+)?excess|\boieo\b/.test(blob)) return "offers_in_excess";
  if (/offers?\s+in\s+(?:the\s+)?region|\boiro\b/.test(blob)) return "offers_in_region";
  return null;
}

/**
 * Covers from the description: the first "<n> covers" is internal; a "<n> covers"
 * near "outside"/"external"/"pavement" is the external seating count.
 */
export function parseCovers(description: string | null | undefined): {
  internal: number | null;
  external: number | null;
} {
  const out = { internal: null as number | null, external: null as number | null };
  if (!description) return out;
  const matches = [...description.matchAll(/(\d+)\s+covers/gi)];
  matches.forEach((m, i) => {
    const count = Number(m[1]);
    const start = m.index ?? 0;
    // Bound the context to this phrase only, so a later "…outside" can't be
    // attributed to an earlier number (and vice-versa).
    const prevEnd = i > 0 ? (matches[i - 1].index ?? 0) + matches[i - 1][0].length : 0;
    const nextStart = i < matches.length - 1 ? (matches[i + 1].index ?? description.length) : description.length;
    const context = description
      .slice(Math.max(prevEnd, start - 30), Math.min(nextStart, start + 60))
      .toLowerCase();
    const isExternal = /outside|external|pavement|al ?fresco|terrace/.test(context);
    if (isExternal) {
      if (out.external === null) out.external = count;
    } else if (out.internal === null) {
      out.internal = count;
    }
  });
  return out;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** Parses the Tenure/lease marketing block into structured lease terms. */
export function parseLease(tenureText: string | null | undefined): {
  lease_term_years: number | null;
  lease_expiry: string | null;
  rent_review_basis: string | null;
  inside_1954_act: boolean | null;
} {
  const out = {
    lease_term_years: null as number | null,
    lease_expiry: null as string | null,
    rent_review_basis: null as string | null,
    inside_1954_act: null as boolean | null,
  };
  if (!tenureText) return out;
  const text = tenureText.toLowerCase();

  const term = text.match(/(\d+)\s*[- ]?\s*year\s+lease/);
  if (term) out.lease_term_years = Number(term[1]);

  const expiry = text.match(/expir\w*\s+(?:on\s+|in\s+)?([a-z]+)?\s*(\d{4})/);
  if (expiry) {
    const month = expiry[1] && MONTHS[expiry[1]] ? MONTHS[expiry[1]] : null;
    const year = expiry[2];
    out.lease_expiry = month
      ? `${year}-${String(month).padStart(2, "0")}-01`
      : `${year}-01-01`;
  }

  const review = text.match(/(\d+)\s*[- ]?\s*yearly\s+rent\s+reviews?/);
  if (review) out.rent_review_basis = `${review[1]} yearly`;

  if (/1954\s+act/.test(text)) {
    // "outside the Act" / "contracted out" ⇒ excluded; otherwise inside.
    out.inside_1954_act = !/outside|contract\w*\s+out|excluded/.test(text);
  }
  return out;
}

/** Use class, e.g. "Class E", "Sui Generis", "A3" — from licence/planning copy. */
export function parseUseClass(...texts: (string | null | undefined)[]): string | null {
  const blob = texts.filter(Boolean).join(" ");
  if (!blob) return null;
  const sui = blob.match(/sui\s+generis/i);
  if (sui) return "Sui Generis";
  const cls = blob.match(/\bClass\s+([A-F][0-9]?(?:\([a-z]\))?)/i);
  if (cls) return `Class ${cls[1].toUpperCase()}`;
  const legacy = blob.match(/\b(A[1-5]|D[12])\b/);
  if (legacy) return legacy[1];
  return null;
}

/** A real EPC grade like "C (72)" → "C (72)"; "Upon enquiry"/blank → null. */
export function parseEpc(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^(upon|on)\b/i.test(trimmed) || /enquiry|request|application/i.test(trimmed)) {
    return null;
  }
  return trimmed || null;
}

/** Year of the next rent review from a key point like "Rent Review 2029". */
function parseNextReview(keyPoints: string[]): number | null {
  for (const kp of keyPoints) {
    const m = kp.match(/rent\s+review\s+(\d{4})/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function parseFitOut(keyPoints: string[], description: string | null | undefined): FitOutState {
  const blob = `${keyPoints.join(" ")} ${description ?? ""}`.toLowerCase();
  if (/shell|stripped\s+back|bare/.test(blob)) return "shell";
  if (/part(?:ially)?[- ]?fitted/.test(blob)) return "part_fitted";
  if (/fully\s+fitted|fitted\s+out|turn[- ]?key/.test(blob)) return "fully_fitted";
  return null;
}

/** Best-effort neighbourhood from "in the heart of X" / "located in X" copy. */
function parseArea(...texts: (string | null | undefined)[]): string | null {
  const blob = texts.filter(Boolean).join(" ");
  const m =
    blob.match(/heart of ([A-Z][\w'’]+(?:\s+[A-Z][\w'’]+){0,2})/) ||
    blob.match(/located in (?:the\s+)?([A-Z][\w'’]+(?:\s+[A-Z][\w'’]+){0,2})/);
  return m ? m[1].trim() : null;
}

function deriveDisposalType(raw: CdgRawProperty): DisposalType {
  const t = `${raw.availabilities ?? ""} ${raw.availability_types ?? ""}`.toLowerCase();
  if (/assignment/.test(t)) return "lease_assignment";
  if (/sub-?let|sub-?lease/.test(t)) return "sublease";
  if (/freehold/.test(t)) return "freehold";
  if (/new\s+lease|to\s+let|leasehold/.test(t)) return "new_lease";
  if (truthy(raw.for_sale)) return "freehold";
  if (truthy(raw.to_let)) return "new_lease";
  return "unknown";
}

function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

function fullName(u: CdgUser | undefined): string | null {
  if (!u) return null;
  const name = [u.forename, u.surname].filter(Boolean).join(" ").trim();
  return name || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping — raw record → DisposalInsert.
// ─────────────────────────────────────────────────────────────────────────────

export function mapCdgToDisposal(raw: CdgRawProperty, sourceUrl: string): DisposalInsert {
  const sections = Object.values(raw.marketing ?? {})
    .filter((s): s is CdgMarketingSection => Boolean(s && s.title))
    .map((s) => ({ title: s.title, content: s.content ?? "" }));

  const sectionByTitle = (re: RegExp) =>
    sections.find((s) => re.test(s.title))?.content ?? null;

  const tenureText = sectionByTitle(/tenure|lease/i) || raw.leasehold || null;
  const rentSection = sectionByTitle(/rent/i);
  const premiumSection = sectionByTitle(/premium/i);
  const licenceText = sectionByTitle(/licen|planning/i);
  const vatText = sectionByTitle(/vat/i);

  const keyFeatures = (raw.key_points ?? [])
    .map((k) => k.key_point)
    .filter((s): s is string => Boolean(s));

  const lease = parseLease(tenureText);
  const covers = parseCovers(raw.description);

  const totals = raw.floor_units?.totals ?? [];
  const sizeSqft = parseMoney(raw.size) ?? (typeof raw.size_to === "number" ? raw.size_to : null);
  const sizeSqm = totals.length >= 3 ? parseMoney(totals[2]) : null;

  const floors = (raw.floor_units?.rows ?? []).map((r) => ({
    name: r.name ?? "",
    sqft: parseMoney(r.sizeSqFt),
    sqm: parseMoney(r.sizeSqM),
  }));

  const vatApplicable = vatText
    ? /\bnot?\s+applicable|no\s+vat/i.test(vatText)
      ? false
      : /applic|chargeable|plus\s+vat|\bvat\b/i.test(vatText)
        ? true
        : null
    : null;

  return {
    source: "cdg",
    source_ref: raw.source_id != null ? String(raw.source_id) : raw.meta_id != null ? String(raw.meta_id) : null,
    source_url: raw.pretty_url || sourceUrl,
    status: raw.status ?? null,
    source_updated_at: raw.updated_at ?? null,

    title: raw.name ?? raw.seo_title ?? null,
    summary: raw.summary ?? null,
    address_line: raw.address1 ?? null,
    area: parseArea(raw.location, raw.summary),
    city: raw.town ?? null,
    postcode: raw.postcode ?? null,
    lat: typeof raw.lat === "number" ? raw.lat : null,
    lng: typeof raw.lng === "number" ? raw.lng : null,

    property_type: raw.building_types ?? null,
    use_class: parseUseClass(licenceText, raw.description),
    disposal_type: deriveDisposalType(raw),
    to_let: truthy(raw.to_let),
    for_sale: truthy(raw.for_sale),

    rent_pa: parseMoney(raw.rent),
    rent_raw: raw.rent || null,
    rent_period: parseRentPeriod(raw.rent),
    premium: parseMoney(raw.premium),
    premium_raw: raw.premium || null,
    guide_price: parseMoney(raw.price),
    price_qualifier: parsePriceQualifier(premiumSection, rentSection, raw.premium, raw.price),
    vat_applicable: vatApplicable,
    rateable_value: parseMoney(raw.rateable_value),
    business_rates: parseMoney(raw.business_rates),
    service_charge: parseMoney(raw.service_charge),
    estate_charge: parseMoney(raw.estate_charge),
    parking_charge: parseMoney(raw.parking_charge),

    tenure_raw: tenureText,
    lease_term_years: lease.lease_term_years,
    lease_expiry: lease.lease_expiry,
    rent_review_basis: lease.rent_review_basis,
    next_rent_review: parseNextReview(keyFeatures),
    inside_1954_act: lease.inside_1954_act,

    size_sqft: sizeSqft,
    size_sqm: sizeSqm,
    covers_internal: covers.internal,
    covers_external: covers.external,
    floors,

    licensing_notes: licenceText,
    fit_out_state: parseFitOut(keyFeatures, raw.description),
    epc_rating: parseEpc(raw.epc),

    description: raw.description ?? null,
    location_description: raw.location ?? null,
    key_features: keyFeatures,
    sections,

    agent_name: fullName(raw.users?.[0]),
    agent_email: raw.users?.[0]?.email ?? null,
    agent_phone: raw.users?.[0]?.tel ?? raw.users?.[0]?.mobile ?? null,
    agent_photo: raw.users?.[0]?.perm_photo ?? raw.users?.[0]?.photo ?? null,

    images: (raw.images ?? [])
      .filter((i) => i.src)
      .map((i) => ({ url: i.src as string, alt: i.alt ?? null })),
    brochure_url: raw.particulars_url || raw.marketing_brochure || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch + extract + map.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

/** Fetches a CDG property URL and returns the mapped, insert-ready disposal row. */
export async function fetchAndExtractCdg(
  url: string,
  init?: { signal?: AbortSignal; userAgent?: string },
): Promise<DisposalInsert> {
  const res = await fetch(url, {
    headers: { "User-Agent": init?.userAgent ?? DEFAULT_UA },
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new CdgExtractError(`Fetch failed: HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  const html = await res.text();
  const raw = extractCdgProperty(html);
  return mapCdgToDisposal(raw, url);
}
