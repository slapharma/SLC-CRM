/**
 * Shelley Sandzer (shelleysandzer.co.uk) → `disposals` extractor — Market
 * Intel partner source #2. A custom Bootstrap build (Graphicks / Property
 * Jungle template) with server-rendered HTML; brochure PDFs live on the
 * Agents' Society S3 bucket but there is no CDG-style JSON data island, so
 * this parses markup directly:
 *
 *  - List pages `/search/1.html`, `/2.html`, … — one `<div class="property">`
 *    card per listing linking to `/property/{id}`. Pages are enumerated until
 *    one yields no new IDs.
 *  - Detail page `/property/{id}` — `<h1>` is "Address, City, Postcode";
 *    carousel images follow `/resize/{id}/{n}/1600`; two body variants:
 *      a) "Features" <ul> + "Summary" <p> + a floor schedule of
 *         "Floor - X / Size - N sqft / Price - … / Status - …" lines;
 *      b) a single "Property Description" block of paragraphs.
 *
 * Rows map to the shared `DisposalInsert` shape with `source:
 * "shelleysandzer"` — the importer stamps `listing_type: "intel"` so these
 * render the unbranded PDF and surface under the Market Intel silo.
 */

import {
  type DisposalInsert,
  parseCovers,
  parseMoney,
  parsePriceQualifier,
  parseRentPeriod,
  parseUseClass,
} from "./cdg.ts";

export const SHELLEYSANDZER_SOURCE = "shelleysandzer";
export const SHELLEYSANDZER_BASE = "https://www.shelleysandzer.co.uk";

export class ShelleySandzerExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShelleySandzerExtractError";
  }
}

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})?\b/;

const decode = (s: string) =>
  s
    .replace(/&pound;/g, "£")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&nbsp;/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();

// ─────────────────────────────────────────────────────────────────────────────
// List pages — enumerate /property/{id} URLs across the paginated search.
// ─────────────────────────────────────────────────────────────────────────────

export function extractShelleySandzerListingUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/href="(\/property\/(\d+))"/g)) {
    urls.add(`${SHELLEYSANDZER_BASE}${m[1]}`);
  }
  return [...urls];
}

/** Walks /search/1.html, /2.html, … until a page adds nothing new. */
export async function fetchShelleySandzerListingUrls(init?: {
  signal?: AbortSignal;
  userAgent?: string;
  maxPages?: number;
}): Promise<string[]> {
  const all = new Set<string>();
  const maxPages = init?.maxPages ?? 20;
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${SHELLEYSANDZER_BASE}/search/${page}.html`, {
      headers: { "User-Agent": init?.userAgent ?? DEFAULT_UA },
      signal: init?.signal ?? AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      if (page === 1) {
        throw new ShelleySandzerExtractError(
          `List fetch failed: HTTP ${res.status} ${res.statusText}`,
        );
      }
      break;
    }
    const pageUrls = extractShelleySandzerListingUrls(await res.text());
    const before = all.size;
    for (const u of pageUrls) all.add(u);
    if (all.size === before) break; // page repeated/empty — done
  }
  if (all.size === 0) {
    throw new ShelleySandzerExtractError(
      "No listing URLs found — the page structure may have changed.",
    );
  }
  return [...all];
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail page → DisposalInsert.
// ─────────────────────────────────────────────────────────────────────────────

/** "Floor - G / Size - 2608 sqft / Price - … / Status - …" blocks. */
function parseFloorSchedule(text: string): {
  floors: { name: string; sqft: number | null; sqm: number | null }[];
  totalSqft: number | null;
} {
  const floors: { name: string; sqft: number | null; sqm: number | null }[] = [];
  const re =
    /Floor\s*[-–]\s*([^\n]+)\n+\s*Size\s*[-–]\s*([\d,.]+)\s*sq\s*ft/gi;
  for (const m of text.matchAll(re)) {
    floors.push({
      name: m[1].trim(),
      sqft: parseMoney(m[2]),
      sqm: null,
    });
  }
  const sized = floors.filter((f) => f.sqft != null);
  const totalSqft = sized.length
    ? sized.reduce((s, f) => s + (f.sqft ?? 0), 0)
    : null;
  return { floors, totalSqft };
}

/** A labelled line in the free copy, e.g. "Rent - £120,000 per annum". */
function copyLine(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*[-–:]\\s*([^\\n]+)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

export function mapShelleySandzerToDisposal(
  html: string,
  sourceUrl: string,
): DisposalInsert {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!titleMatch) {
    throw new ShelleySandzerExtractError(`No <h1> title found at ${sourceUrl}`);
  }
  const title = decode(titleMatch[1]);
  const id = sourceUrl.replace(/\/+$/, "").split("/").pop() ?? sourceUrl;

  // Content column: everything between the first content <h2> and the map/
  // footer. Both variants (Features/Summary and Property Description) live in
  // the first `col-sm-6` of the detail row.
  const contentMatch = html.match(
    /<div class="col-sm-6">([\s\S]*?)<div class="col-sm-6">/i,
  );
  const contentHtml = contentMatch ? contentMatch[1] : "";

  const featuresMatch = contentHtml.match(
    /<h2>Features<\/h2>\s*<ul[^>]*>([\s\S]*?)<\/ul>/i,
  );
  const keyFeatures = featuresMatch
    ? [...featuresMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => decode(m[1]))
        .filter(Boolean)
    : [];

  // Body text minus the features list — covers both variants.
  const bodyHtml = contentHtml
    .replace(/<h2>Features<\/h2>\s*<ul[^>]*>[\s\S]*?<\/ul>/i, "")
    .replace(/<a class="back2"[\s\S]*$/i, "");
  const bodyText = decode(bodyHtml)
    .replace(/^(Summary|Property Description)\s*/i, "")
    .replace(/BACK TO SEARCH RESULTS\s*$/i, "")
    .trim();

  const { floors, totalSqft } = parseFloorSchedule(bodyText);

  // Description: body copy with the floor-schedule lines stripped.
  const description =
    bodyText
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !/^(Floor|Size|Price|Status)\s*[-–]/i.test(l) &&
          !/^BACK TO SEARCH RESULTS$/i.test(l),
      )
      .join("\n")
      .replace(/\n{3,}/g, "\n\n") || null;

  const rentText = copyLine(bodyText, "Rent");
  const premiumText = copyLine(bodyText, "Premium");
  const nilPremium =
    (premiumText != null && /\bnil\b/i.test(premiumText)) ||
    keyFeatures.some((f) => /nil premium/i.test(f));

  // Title is "Address, City, Postcode" — postcode may be partial ("WC1").
  const titleParts = title.split(",").map((s) => s.trim());
  const pcMatches = [...`${title}\n${description ?? ""}`.matchAll(new RegExp(UK_POSTCODE, "g"))];
  const pcMatch = pcMatches.find((m) => m[2]) ?? pcMatches[0];
  const postcode = pcMatch
    ? [pcMatch[1], pcMatch[2]].filter(Boolean).join(" ")
    : null;
  const cityPart = titleParts
    .slice(1)
    .map((p) => p.replace(UK_POSTCODE, "").trim())
    .filter(Boolean)
    .pop();
  const city = cityPart ?? (/london/i.test(title) ? "London" : null);

  // Carousel images: /resize/{id}/{n}/1600 (PageSpeed may suffix the src).
  const images = [
    ...new Set(
      [...html.matchAll(new RegExp(`src="(/resize/${id}/\\d+/1600)[^"]*"`, "g"))].map(
        (m) => `${SHELLEYSANDZER_BASE}${m[1]}`,
      ),
    ),
  ].map((url) => ({ url, alt: null }));

  const brochure = html.match(
    /<a href="(https:\/\/s3[^"]+\.pdf)"[^>]*>\s*DOWNLOAD PDF/i,
  );

  const searchable = `${title}\n${keyFeatures.join("\n")}\n${description ?? ""}`;
  const covers = parseCovers(searchable);
  const forSale = /for sale|freehold sale/i.test(searchable) && !/to let/i.test(searchable);

  return {
    source: SHELLEYSANDZER_SOURCE,
    source_ref: id,
    source_url: sourceUrl,
    status: "Available",
    source_updated_at: null,

    title,
    summary: description ? description.split("\n")[0] : null,
    address_line: titleParts[0] ?? null,
    area: null,
    city,
    postcode,
    lat: null,
    lng: null,

    property_type: null,
    use_class: parseUseClass(searchable),
    disposal_type: forSale
      ? "freehold"
      : /assignment/i.test(searchable)
        ? "lease_assignment"
        : "new_lease",
    to_let: !forSale,
    for_sale: forSale,

    rent_pa: parseMoney(rentText),
    rent_raw: rentText,
    rent_period: parseRentPeriod(rentText) ?? (rentText ? "per annum" : null),
    premium: nilPremium ? 0 : parseMoney(premiumText),
    premium_raw: premiumText,
    guide_price: null,
    price_qualifier: parsePriceQualifier(premiumText, rentText, null),
    vat_applicable: null,
    rateable_value: null,
    business_rates: null,
    service_charge: null,
    estate_charge: null,
    parking_charge: null,

    tenure_raw: null,
    lease_term_years: null,
    lease_expiry: null,
    rent_review_basis: null,
    next_rent_review: null,
    inside_1954_act: null,

    size_sqft: totalSqft,
    size_sqm: null,
    covers_internal: covers.internal,
    covers_external: covers.external,
    floors,

    licensing_notes: null,
    fit_out_state: /fully.fitted/i.test(searchable)
      ? "fully_fitted"
      : /part(ially)?.fitted/i.test(searchable)
        ? "part_fitted"
        : /shell/i.test(searchable)
          ? "shell"
          : null,
    epc_rating: null,

    description,
    location_description: null,
    key_features: keyFeatures,
    sections: [],

    agent_name: null,
    agent_email: null,
    agent_phone: null,
    agent_photo: null,

    images,
    brochure_url: brochure ? brochure[1] : null,
  };
}

/** Fetches a Shelley Sandzer detail URL and returns the mapped disposal row. */
export async function fetchAndExtractShelleySandzer(
  url: string,
  init?: { signal?: AbortSignal; userAgent?: string },
): Promise<DisposalInsert> {
  const res = await fetch(url, {
    headers: { "User-Agent": init?.userAgent ?? DEFAULT_UA },
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new ShelleySandzerExtractError(
      `Fetch failed: HTTP ${res.status} ${res.statusText} for ${url}`,
    );
  }
  return mapShelleySandzerToDisposal(await res.text(), url);
}
