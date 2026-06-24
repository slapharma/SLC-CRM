/**
 * Verification harness for the CDG extractor.
 *
 *   node scripts/verify-cdg.ts <path-to-saved-html>   # offline, against a fixture
 *   node scripts/verify-cdg.ts --live <cdg-url>        # fetches the live page
 *
 * Asserts the parsed `disposals` row matches the known-good values for the
 * 311 West End Lane listing (CDG ref 378436). Exits non-zero on any mismatch.
 */
import { readFileSync } from "node:fs";

import {
  extractCdgProperty,
  mapCdgToDisposal,
  fetchAndExtractCdg,
  type DisposalInsert,
} from "../src/lib/disposals/cdg.ts";
import { cleanImageUrl, isWatermarked, filenameFromUrl } from "../src/lib/disposals/image.ts";

const KNOWN_GOOD_URL =
  "https://www.cdgleisure.com/find-a-property/properties/378436-311-west-end-lane-london";

async function getRow(): Promise<DisposalInsert> {
  const args = process.argv.slice(2);
  if (args[0] === "--live") {
    const url = args[1] ?? KNOWN_GOOD_URL;
    console.log(`Fetching live: ${url}`);
    return fetchAndExtractCdg(url);
  }
  const path = args[0];
  if (!path) throw new Error("Usage: node scripts/verify-cdg.ts <html-fixture> | --live [url]");
  const html = readFileSync(path, "utf8");
  return mapCdgToDisposal(extractCdgProperty(html), KNOWN_GOOD_URL);
}

type Check = [label: string, actual: unknown, expected: unknown];

function run(row: DisposalInsert): number {
  const checks: Check[] = [
    ["source_ref", row.source_ref, "378436"],
    ["title", row.title, "311 West End Lane"],
    ["postcode", row.postcode, "NW6 1RD"],
    ["city", row.city, "London"],
    ["area", row.area, "West Hampstead"],
    ["property_type", row.property_type, "Restaurant"],
    ["use_class", row.use_class, "Class E"],
    ["disposal_type", row.disposal_type, "lease_assignment"],
    ["to_let", row.to_let, true],
    ["for_sale", row.for_sale, false],
    ["rent_pa", row.rent_pa, 50000],
    ["rent_period", row.rent_period, "per annum"],
    ["premium", row.premium, 95000],
    ["price_qualifier", row.price_qualifier, "offers_in_region"],
    ["vat_applicable", row.vat_applicable, true],
    ["size_sqft", row.size_sqft, 650],
    ["size_sqm", row.size_sqm, 60.39],
    ["covers_internal", row.covers_internal, 24],
    ["covers_external", row.covers_external, 16],
    ["lease_term_years", row.lease_term_years, 16],
    ["lease_expiry", row.lease_expiry, "2041-06-01"],
    ["rent_review_basis", row.rent_review_basis, "4 yearly"],
    ["next_rent_review", row.next_rent_review, 2029],
    ["inside_1954_act", row.inside_1954_act, true],
    ["fit_out_state", row.fit_out_state, "fully_fitted"],
    ["epc_rating", row.epc_rating, null],
    ["agent_name", row.agent_name, "David Kornbluth"],
    ["agent_email", row.agent_email, "davidk@cdgleisure.com"],
    ["agent_phone", row.agent_phone, "07507880040"],
    ["key_features.length", row.key_features.length, 5],
    ["sections.length", row.sections.length, 7],
    ["images.length", row.images.length, 3],
    ["floors.length", row.floors.length, 1],
    ["brochure ends .pdf", row.brochure_url?.endsWith(".pdf") ?? false, true],
  ];

  let failures = 0;
  for (const [label, actual, expected] of checks) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(
      `${ok ? "✓" : "✗"} ${label.padEnd(22)} ${ok ? "" : `got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`}`,
    );
  }
  console.log(`\n${checks.length - failures}/${checks.length} checks passed.`);
  return failures;
}

function runImageChecks(): number {
  const wm =
    "https://as-images.imgix.net/e5e8-frontage.jpeg" +
    "?mark=https%3A%2F%2Fx.png&mark-alpha=90&mark-scale=30&mark-align=right,bottom";
  const sized = "https://as-images.imgix.net/e5e8-frontage.jpeg?w=800&mark=x&mark-alpha=90";
  const checks: Check[] = [
    ["isWatermarked(wm)", isWatermarked(wm), true],
    ["cleanImageUrl(wm)", cleanImageUrl(wm), "https://as-images.imgix.net/e5e8-frontage.jpeg"],
    ["isWatermarked(clean)", isWatermarked(cleanImageUrl(wm)), false],
    ["cleanImageUrl keeps non-mark", cleanImageUrl(sized), "https://as-images.imgix.net/e5e8-frontage.jpeg?w=800"],
    ["filenameFromUrl(wm)", filenameFromUrl(wm), "e5e8-frontage.jpeg"],
  ];
  let failures = 0;
  for (const [label, actual, expected] of checks) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${label.padEnd(28)} ${ok ? "" : `got ${JSON.stringify(actual)} — expected ${JSON.stringify(expected)}`}`);
  }
  console.log(`image helpers: ${checks.length - failures}/${checks.length} passed.\n`);
  return failures;
}

const imgFailures = runImageChecks();
const row = await getRow();
const failures = run(row) + imgFailures;
console.log("\n── full mapped row ──");
console.log(JSON.stringify(row, null, 2));
process.exit(failures === 0 ? 0 : 1);
