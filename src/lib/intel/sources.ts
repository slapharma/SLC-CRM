/**
 * Market Intel partner-source registry — the single place that knows which
 * external agents we scrape, how to enumerate their books, and how to label
 * them in the UI. Used by the Admin resync/delete actions, the Listings
 * "Source" column, and the standalone scrape scripts.
 */

import type { DisposalInsert } from "@/lib/disposals/cdg";
import {
  fetchAndExtractLewisCraig,
  fetchLewisCraigListingUrls,
  LEWISCRAIG_SOURCE,
} from "@/lib/disposals/lewiscraig";
import {
  fetchAndExtractShelleySandzer,
  fetchShelleySandzerListingUrls,
  SHELLEYSANDZER_SOURCE,
} from "@/lib/disposals/shelleysandzer";

export interface IntelSource {
  id: string;
  label: string;
  website: string;
  /** Null until a scraper module lands — renders as "coming soon" in Admin. */
  scraper: {
    fetchUrls: () => Promise<string[]>;
    fetchDetail: (url: string) => Promise<DisposalInsert>;
  } | null;
}

export const INTEL_SOURCES: IntelSource[] = [
  {
    id: LEWISCRAIG_SOURCE,
    label: "Lewis Craig",
    website: "https://www.lewiscraig.co.uk/",
    scraper: {
      fetchUrls: () => fetchLewisCraigListingUrls(),
      fetchDetail: (url) => fetchAndExtractLewisCraig(url),
    },
  },
  {
    id: SHELLEYSANDZER_SOURCE,
    label: "Shelley Sandzer",
    website: "https://www.shelleysandzer.co.uk/",
    scraper: {
      fetchUrls: () => fetchShelleySandzerListingUrls(),
      fetchDetail: (url) => fetchAndExtractShelleySandzer(url),
    },
  },
  {
    id: "dcl",
    label: "DCL",
    website: "https://www.dcl.co.uk/",
    scraper: null,
  },
];

export const intelSourceById = new Map(INTEL_SOURCES.map((s) => [s.id, s]));

/** Pretty label for a disposals.source value ("lewiscraig" → "Lewis Craig"). */
export function intelSourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return intelSourceById.get(source)?.label ?? source;
}

/** Run `fn` over `items` with a fixed-size worker pool. */
export async function pool<T, R>(
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
