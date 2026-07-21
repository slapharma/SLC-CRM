/**
 * Lewis Craig (lewiscraig.co.uk) → `disposals` extractor — the first Market
 * Intel partner source. Their site is a WordPress build with server-rendered
 * HTML (no data island like CDG's Agents' Society platform), so this parses
 * the page markup directly with targeted regexes:
 *
 *  - List page `/available-properties/`: one `<article class="extended ...">`
 *    per property. Available stock has a linked `<h1 class="entry-title">`;
 *    let/sold stock has a plain title + `<span class=featured-category>` badge.
 *  - Detail page `/retail/<slug>/`: "Details" block with Rent / Premium /
 *    Total Size lines, description paragraphs, a thumbnail gallery, agent
 *    vcards and a "Download details" PDF brochure link.
 *
 * Rows map to the same `DisposalInsert` shape as the CDG extractor, with
 * `source: "lewiscraig"` — the importer stamps `listing_type: "intel"` so
 * these render the unbranded PDF and surface as Market Intel in the CRM.
 */

import {
  type DisposalInsert,
  parseCovers,
  parseMoney,
  parsePriceQualifier,
  parseRentPeriod,
  parseUseClass,
} from "./cdg.ts";

export const LEWISCRAIG_SOURCE = "lewiscraig";
export const LEWISCRAIG_LIST_URL = "https://www.lewiscraig.co.uk/available-properties/";

export class LewisCraigExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LewisCraigExtractError";
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
// List page — available detail-page URLs.
// ─────────────────────────────────────────────────────────────────────────────

/** Available listings only — let/sold cards carry no detail link. */
export function extractLewisCraigListingUrls(html: string): string[] {
  const urls = new Set<string>();
  // "More information" anchors only exist on live stock (attrs are unquoted).
  const re = /href=(https:\/\/www\.lewiscraig\.co\.uk\/retail\/[a-z0-9-]+\/)\s*>More information/gi;
  for (const m of html.matchAll(re)) urls.add(m[1]);
  return [...urls];
}

/** Fetches the list page and returns every available detail-page URL. */
export async function fetchLewisCraigListingUrls(init?: {
  signal?: AbortSignal;
  userAgent?: string;
}): Promise<string[]> {
  const res = await fetch(LEWISCRAIG_LIST_URL, {
    headers: { "User-Agent": init?.userAgent ?? DEFAULT_UA },
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new LewisCraigExtractError(
      `List fetch failed: HTTP ${res.status} ${res.statusText}`,
    );
  }
  const urls = extractLewisCraigListingUrls(await res.text());
  if (urls.length === 0) {
    throw new LewisCraigExtractError(
      "No listing URLs found — the page structure may have changed.",
    );
  }
  return urls;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail page → DisposalInsert.
// ─────────────────────────────────────────────────────────────────────────────

/** "Rent:" / "Premium:" / "Price:" line → its rendered text ("£235,000 per annum"). */
function detailLine(html: string, label: string): string | null {
  const re = new RegExp(
    `<strong>${label}:?</strong>\\s*<span[^>]*>([\\s\\S]*?)</p>`,
    "i",
  );
  const m = html.match(re);
  return m ? decode(m[1]) : null;
}

function parseAgents(html: string): { name: string; phone: string | null; email: string | null }[] {
  const out: { name: string; phone: string | null; email: string | null }[] = [];
  const re = /<summary class=summary>([^<]+)<\/summary><div class=content>([\s\S]*?)<\/details>/gi;
  for (const m of html.matchAll(re)) {
    const block = m[2];
    const phone = block.match(/(\+?[\d][\d ()-]{7,})/);
    const email = block.match(/mailto:([^>"'\s]+)/);
    out.push({
      name: decode(m[1]),
      phone: phone ? phone[1].trim() : null,
      email: email ? email[1] : null,
    });
  }
  return out;
}

export function mapLewisCraigToDisposal(html: string, sourceUrl: string): DisposalInsert {
  const titleMatch = html.match(/<h1 class="entry-title">([\s\S]*?)<\/h1>/i);
  if (!titleMatch) {
    throw new LewisCraigExtractError(`No entry-title found at ${sourceUrl}`);
  }
  const title = decode(titleMatch[1]);

  // Description: the entry-content paragraphs, minus the Details lines and the
  // Misdescriptions Act boilerplate.
  const contentMatch = html.match(
    /<div class=entry-content-inner>([\s\S]*?)(?:<div class=terms-and-conditions>|<\/div><\/div><aside)/i,
  );
  const contentHtml = contentMatch ? contentMatch[1] : "";
  const paragraphs = [...contentHtml.matchAll(/<p>([\s\S]*?)<\/p>/gi)]
    .map((m) => decode(m[1]))
    .filter((p) => p && !/^(Rent|Premium|Price|Total Size):/i.test(p));
  const description = paragraphs.join("\n\n") || null;

  const rentText = detailLine(html, "Rent");
  const premiumText = detailLine(html, "Premium");
  const priceText = detailLine(html, "Price") ?? detailLine(html, "Guide Price");
  const sizeText = detailLine(html, "Total Size");

  const nilPremium = premiumText != null && /\bnil\b/i.test(premiumText);

  // Postcode/city — best-effort. A full postcode anywhere in the copy beats a
  // bare district ("W1") from the title.
  const postcodeSource = `${title}\n${description ?? ""}`;
  const pcMatches = [...postcodeSource.matchAll(new RegExp(UK_POSTCODE, "g"))];
  const pcMatch = pcMatches.find((m) => m[2]) ?? pcMatches[0];
  const postcode = pcMatch
    ? [pcMatch[1], pcMatch[2]].filter(Boolean).join(" ")
    : null;
  const titleParts = title.split(",").map((s) => s.trim());
  const cityPart = titleParts
    .slice(1)
    .map((p) => p.replace(UK_POSTCODE, "").trim())
    .filter(Boolean)
    .pop();
  const city = cityPart ?? (/london/i.test(title) ? "London" : null);

  const images = [
    ...new Set(
      [...html.matchAll(/<a href=(https:\/\/www\.lewiscraig\.co\.uk\/wp-content\/uploads\/[^\s>]+?-451x308\.(?:jpg|jpeg|png))\s/gi)].map(
        (m) => m[1],
      ),
    ),
  ].map((url) => ({ url, alt: null }));

  const brochure = html.match(
    /<address class=more-details-links>\s*<a href=([^\s>]+\.pdf)/i,
  );

  const agents = parseAgents(html);
  const covers = parseCovers(description);
  const slug = sourceUrl.replace(/\/+$/, "").split("/").pop() ?? sourceUrl;

  const forSale = priceText != null && rentText == null;

  return {
    source: LEWISCRAIG_SOURCE,
    source_ref: slug,
    source_url: sourceUrl,
    status: "Available",
    source_updated_at: null,

    title,
    summary: paragraphs[0] ?? null,
    address_line: titleParts[0] ?? null,
    area: null,
    city,
    postcode,
    lat: null,
    lng: null,

    property_type: null,
    use_class: parseUseClass(description),
    disposal_type: forSale
      ? "freehold"
      : /assignment/i.test(description ?? "")
        ? "lease_assignment"
        : "new_lease",
    to_let: !forSale,
    for_sale: forSale,

    rent_pa: parseMoney(rentText),
    rent_raw: rentText,
    rent_period: parseRentPeriod(rentText) ?? (rentText ? "per annum" : null),
    premium: nilPremium ? 0 : parseMoney(premiumText),
    premium_raw: premiumText,
    guide_price: parseMoney(priceText),
    price_qualifier: parsePriceQualifier(premiumText, rentText, priceText),
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

    size_sqft: parseMoney(sizeText),
    size_sqm: null,
    covers_internal: covers.internal,
    covers_external: covers.external,
    floors: [],

    licensing_notes: null,
    fit_out_state: null,
    epc_rating: null,

    description,
    location_description: null,
    key_features: [],
    sections: [],

    agent_name: agents[0]?.name ?? null,
    agent_email: agents[0]?.email ?? null,
    agent_phone: agents[0]?.phone ?? null,
    agent_photo: null,

    images,
    brochure_url: brochure ? brochure[1] : null,
  };
}

/** Fetches a Lewis Craig detail URL and returns the mapped disposal row. */
export async function fetchAndExtractLewisCraig(
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
    throw new LewisCraigExtractError(
      `Fetch failed: HTTP ${res.status} ${res.statusText} for ${url}`,
    );
  }
  return mapLewisCraigToDisposal(await res.text(), url);
}
