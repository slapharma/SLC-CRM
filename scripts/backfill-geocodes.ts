/**
 * Backfill lat/lng for records that have a postal address but no coordinates.
 * Covers `disposals` (the ~81 real CDG listings), `companies` and `contacts`.
 *
 *   node --env-file=.env.local scripts/backfill-geocodes.ts
 *
 * Requires GOOGLE_MAPS_SERVER_KEY (Geocoding API enabled). For write access set
 * ONE of:
 *   - SUPABASE_SERVICE_ROLE_KEY  (preferred — bypasses RLS), or
 *   - BACKFILL_EMAIL + BACKFILL_PASSWORD  (a real agency member to sign in as).
 *
 * Self-contained (no `@/` alias imports) so Node's TS stripping runs it directly.
 * Idempotent: only touches rows where lat IS NULL and an address exists.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mapsKey = process.env.GOOGLE_MAPS_SERVER_KEY;

if (!url) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL (use --env-file=.env.local).");
if (!mapsKey) throw new Error("Set GOOGLE_MAPS_SERVER_KEY (Geocoding API enabled).");

const supabase = createClient(url, serviceKey ?? anon ?? "", {
  auth: { persistSession: false },
});

if (!serviceKey) {
  const email = process.env.BACKFILL_EMAIL;
  const password = process.env.BACKFILL_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "No SUPABASE_SERVICE_ROLE_KEY — set BACKFILL_EMAIL + BACKFILL_PASSWORD to sign in instead.",
    );
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = {
  id: string;
  address_line: string | null;
  city: string | null;
  postcode: string | null;
};

async function geocode(row: Row): Promise<{ lat: number; lng: number } | null> {
  const query = [row.address_line, row.city, row.postcode]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  const u =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(query)}&region=gb&key=${mapsKey}`;
  const res = await fetch(u, { cache: "no-store" } as RequestInit);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    status: string;
    results?: { geometry?: { location?: { lat: number; lng: number } } }[];
  };
  const loc = body.status === "OK" ? body.results?.[0]?.geometry?.location : null;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

async function backfill(table: "disposals" | "companies" | "contacts") {
  const { data, error } = await supabase
    .from(table)
    .select("id, address_line, city, postcode")
    .is("lat", null);
  if (error) {
    console.error(`  ${table}: query failed — ${error.message}`);
    return;
  }
  const rows = (data ?? []) as Row[];
  let done = 0;
  let skipped = 0;
  for (const row of rows) {
    const geo = await geocode(row);
    if (!geo) {
      skipped++;
      continue;
    }
    const { error: upErr } = await supabase
      .from(table)
      .update({ lat: geo.lat, lng: geo.lng })
      .eq("id", row.id);
    if (upErr) {
      console.error(`  ${table}/${row.id}: update failed — ${upErr.message}`);
      skipped++;
    } else {
      done++;
    }
    await sleep(120); // be gentle with the Geocoding API QPS
  }
  console.log(`  ${table}: geocoded ${done}, skipped ${skipped} (of ${rows.length}).`);
}

console.log("Backfilling geocodes…");
await backfill("disposals");
await backfill("companies");
await backfill("contacts");
console.log("Done.");
