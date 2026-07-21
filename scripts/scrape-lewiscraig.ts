/**
 * Pull Lewis Craig's available property book into insert-ready `disposals` rows
 * (Market Intel silo — the first partner-agent source).
 *
 *   node scripts/scrape-lewiscraig.ts            # scrape live, write the JSON seed
 *   node scripts/scrape-lewiscraig.ts --limit 3  # quick smoke test
 *
 * The `/available-properties/` list page is enumerated for detail URLs (only
 * live stock carries a "More information" link), then each detail page is
 * fetched through `fetchAndExtractLewisCraig`.
 *
 * Output: `supabase/seeds/lewiscraig_listings.json` — input to
 * `scripts/generate-lewiscraig-seed.ts`, which renders the SQL seed.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { DisposalInsert } from "../src/lib/disposals/cdg.ts";
import {
  fetchAndExtractLewisCraig,
  fetchLewisCraigListingUrls,
  LEWISCRAIG_LIST_URL,
} from "../src/lib/disposals/lewiscraig.ts";

const CONCURRENCY = 4;
const RETRIES = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "supabase", "seeds", "lewiscraig_listings.json");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function extractWithRetry(url: string): Promise<DisposalInsert> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await fetchAndExtractLewisCraig(url);
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

  console.log(`Enumerating Lewis Craig book from ${LEWISCRAIG_LIST_URL} …`);
  let urls = await fetchLewisCraigListingUrls();
  console.log(`Found ${urls.length} available listings.`);
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
