/**
 * Pull CDG Leisure's *entire* property book into insert-ready `disposals` rows.
 *
 *   node scripts/scrape-cdg-all.ts            # scrape live, write the JSON seed
 *   node scripts/scrape-cdg-all.ts --limit 5  # quick smoke test (first 5 only)
 *
 * How it works
 * ────────────
 * The find-a-property index page embeds a lightweight record for every live
 * listing in its `AI.mapBox.init(...)` data island — including each listing's
 * detail-page `url`. We read that array to enumerate the book, then fetch each
 * detail page through the existing `fetchAndExtractCdg` extractor to get the full,
 * rich record (rent, lease terms, covers, floors, marketing sections, agent, media).
 *
 * Output: `supabase/seeds/cdg_listings.json` — an array of `DisposalInsert` rows
 * with watermark-stripped image URLs (original kept as `source_url`). This file is
 * the input to `scripts/generate-cdg-seed.ts`, which renders the SQL seed.
 *
 * Pure data step — no Supabase/Next imports, so it runs as a plain node script.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  extractCdgRecords,
  fetchAndExtractCdg,
  type CdgRawProperty,
  type DisposalInsert,
} from "../src/lib/disposals/cdg.ts";
import { cleanImageUrl } from "../src/lib/disposals/image.ts";

const INDEX_URL = "https://www.cdgleisure.com/find-a-property/properties";
const CONCURRENCY = 5;
const RETRIES = 3;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120 Safari/537.36";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "supabase", "seeds", "cdg_listings.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch the index page and return every listing's detail-page URL. */
async function listPropertyUrls(): Promise<string[]> {
  const res = await fetch(INDEX_URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Index fetch failed: HTTP ${res.status}`);
  const records = extractCdgRecords(await res.text());
  const urls = records
    .map((r: CdgRawProperty) => (typeof r.url === "string" ? r.url : null))
    .filter((u): u is string => Boolean(u));
  // De-dupe defensively (the platform can repeat a pin).
  return [...new Set(urls)];
}

/** Strip imgix watermark params, preserving the original as `source_url`. */
function cleanImages(row: DisposalInsert): DisposalInsert {
  return {
    ...row,
    images: row.images.map((img) => ({
      url: cleanImageUrl(img.url),
      alt: img.alt,
      source_url: img.source_url ?? img.url,
    })),
  };
}

async function extractWithRetry(url: string): Promise<DisposalInsert> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return cleanImages(await fetchAndExtractCdg(url, { userAgent: UA }));
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

/** Run `fn` over `items` with a fixed-size worker pool. */
async function pool<T, R>(
  items: T[],
  size: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return out;
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

  console.log(`Enumerating CDG property book from ${INDEX_URL} …`);
  let urls = await listPropertyUrls();
  console.log(`Found ${urls.length} listings.`);
  if (Number.isFinite(limit)) urls = urls.slice(0, limit);

  const failures: { url: string; error: string }[] = [];
  let done = 0;
  const rows = await pool(urls, CONCURRENCY, async (url) => {
    try {
      const row = await extractWithRetry(url);
      console.log(`✓ [${++done}/${urls.length}] ${row.source_ref} — ${row.title}`);
      return row;
    } catch (err) {
      failures.push({ url, error: (err as Error).message });
      console.log(`✗ [${++done}/${urls.length}] ${url} — ${(err as Error).message}`);
      return null;
    }
  });

  const good = rows.filter((r): r is DisposalInsert => r !== null);
  writeFileSync(OUT, JSON.stringify(good, null, 2));
  console.log(`\nWrote ${good.length} listings → ${OUT}`);
  if (failures.length) {
    console.log(`\n${failures.length} failed:`);
    for (const f of failures) console.log(`  ${f.url} — ${f.error}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
