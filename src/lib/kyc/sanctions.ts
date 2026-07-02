// OFSI / UK Sanctions List screening. Downloads HM Treasury's free consolidated
// list (no key), parses the names, and fuzzy-matches the company + its officers /
// PSCs. Any hit is surfaced as "requires manual review" — name matching alone is
// never proof, so we deliberately avoid over-confident automatic conclusions.

import { OFSI_CONSOLIDATED_LIST_URL } from "./config";
import type { SanctionsMatch } from "./types";

type SanctionEntry = { name: string; norm: string; tokens: string[]; regime: string };

// In-process cache so we don't re-download/re-parse the (~MBs) list on every run.
let cache: { entries: SanctionEntry[]; at: number } | null = null;
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const COMPANY_SUFFIXES = new Set([
  "ltd",
  "limited",
  "plc",
  "llp",
  "lp",
  "llc",
  "inc",
  "co",
  "company",
  "holdings",
  "group",
  "uk",
]);

function normalise(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokensOf(norm: string, dropSuffixes: boolean): string[] {
  const t = norm.split(" ").filter(Boolean);
  return dropSuffixes ? t.filter((w) => !COMPANY_SUFFIXES.has(w)) : t;
}

/** Minimal RFC-4180-ish CSV row parser (handles quoted fields with commas). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function loadList(): Promise<SanctionEntry[] | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries;
  try {
    const res = await fetch(OFSI_CONSOLIDATED_LIST_URL, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    // The OFSI file has a title row, then a header row containing "Name 1".
    const headerIdx = lines.findIndex((l) => /name 1/i.test(l));
    if (headerIdx === -1) return null;
    const header = parseCsvLine(lines[headerIdx]).map((h) => h.trim().toLowerCase());
    const nameCols = ["name 1", "name 2", "name 3", "name 4", "name 5", "name 6"]
      .map((h) => header.indexOf(h))
      .filter((i) => i >= 0);
    const regimeIdx = header.findIndex((h) => h.includes("regime"));

    const entries: SanctionEntry[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = parseCsvLine(line);
      const name = nameCols
        .map((c) => (cols[c] ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
      if (!name) continue;
      const norm = normalise(name);
      if (!norm) continue;
      entries.push({
        name,
        norm,
        tokens: tokensOf(norm, false),
        regime: (regimeIdx >= 0 ? cols[regimeIdx] : "")?.trim() || "UK/OFSI",
      });
    }
    cache = { entries, at: Date.now() };
    return entries;
  } catch {
    return null;
  }
}

function scoreMatch(queryTokens: string[], entry: SanctionEntry): number {
  if (queryTokens.length === 0) return 0;
  const qSet = new Set(queryTokens);
  const eSet = new Set(entry.tokens);
  if (entry.norm === queryTokens.join(" ")) return 1;
  // Require every query token to appear in the entry (guards against partials).
  const allPresent = queryTokens.every((t) => eSet.has(t));
  if (!allPresent) return 0;
  const union = new Set([...qSet, ...eSet]).size;
  return union ? qSet.size / union : 0; // Jaccard of query⊆entry
}

/**
 * Screen a set of names. `available` is false when the list couldn't be loaded
 * (so the caller can show "screening unavailable" rather than a false all-clear).
 * Single-token names are skipped — too generic to match responsibly.
 */
export async function screenNames(
  names: { value: string; isCompany?: boolean }[],
): Promise<{ available: boolean; matches: SanctionsMatch[] }> {
  const entries = await loadList();
  if (!entries) return { available: false, matches: [] };

  const matches: SanctionsMatch[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    const norm = normalise(n.value);
    const queryTokens = tokensOf(norm, Boolean(n.isCompany));
    if (queryTokens.length < 2) continue; // too generic
    for (const entry of entries) {
      const score = scoreMatch(queryTokens, entry);
      if (score >= 0.6) {
        const key = `${n.value}|${entry.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({
          query: n.value,
          matchedName: entry.name,
          listName: entry.regime,
          score: Math.round(score * 100) / 100,
        });
      }
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return { available: true, matches: matches.slice(0, 25) };
}
