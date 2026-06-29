/**
 * Load the scraped CDG property book into the live demo agency's `disposals`,
 * replacing whatever supply is there (dummy seed rows or a prior CDG load).
 *
 *   node --env-file=.env.local scripts/load-cdg-listings.ts
 *
 * Auth path: there is no service-role key in this project, so — exactly like the
 * app — we sign in as a demo agency member (agent1) and write through the table's
 * RLS policy. Input is supabase/seeds/cdg_listings.json (from scrape-cdg-all.ts).
 *
 * Idempotent: deletes the agency's existing disposals, then inserts the JSON rows
 * with a round-robin lead/created_by agent. Re-run any time.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import type { DisposalInsert } from "../src/lib/disposals/cdg.ts";

const AGENCY_NAME = "SLC CDG Demo";
const LOGIN = { email: "agent1@slc.test", password: "Demo!2026" };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (use --env-file=.env.local).");

const __dirname = dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(
  readFileSync(join(__dirname, "..", "supabase", "seeds", "cdg_listings.json"), "utf8"),
) as DisposalInsert[];

const supabase = createClient(url, anon, { auth: { persistSession: false } });

const { data: signIn, error: authErr } = await supabase.auth.signInWithPassword(LOGIN);
if (authErr) throw new Error(`Sign-in failed: ${authErr.message}`);
const userId = signIn.user!.id;

const { data: agency, error: agErr } = await supabase
  .from("agencies").select("id").eq("name", AGENCY_NAME).single();
if (agErr || !agency) throw new Error(`Agency "${AGENCY_NAME}" not found: ${agErr?.message}`);
const agencyId = (agency as { id: string }).id;

const { data: members, error: memErr } = await supabase
  .from("agency_members").select("user_id").eq("agency_id", agencyId).order("user_id");
if (memErr || !members?.length) throw new Error(`No agency members: ${memErr?.message}`);
const memberIds = (members as { user_id: string }[]).map((m) => m.user_id);

// Map each real CDG agent's display name → demo account, so a listing's lead agent
// is the agent who actually handles it on CDG (falls back to round-robin).
const { data: profiles } = await supabase
  .from("profiles").select("id, full_name").in("id", memberIds);
const idByName = new Map(
  (profiles ?? [])
    .filter((p) => p.full_name)
    .map((p) => [p.full_name as string, p.id as string]),
);

// Replace existing supply for this agency.
const { error: delErr, count } = await supabase
  .from("disposals").delete({ count: "exact" }).eq("agency_id", agencyId);
if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
console.log(`Deleted ${count ?? "?"} existing disposal(s) from ${AGENCY_NAME}.`);

const payload = rows.map((row, i) => {
  const agent =
    (row.agent_name && idByName.get(row.agent_name)) ||
    memberIds[(i + 1) % memberIds.length];
  return { ...row, agency_id: agencyId, lead_agent_id: agent, created_by: userId };
});

// Insert in batches to keep each request modest.
const BATCH = 20;
let inserted = 0;
for (let i = 0; i < payload.length; i += BATCH) {
  const slice = payload.slice(i, i + BATCH);
  const { error } = await supabase.from("disposals").insert(slice);
  if (error) throw new Error(`Insert batch ${i / BATCH + 1} failed: ${error.message}`);
  inserted += slice.length;
  console.log(`Inserted ${inserted}/${payload.length}…`);
}

console.log(`\nDone. ${inserted} CDG listings loaded into "${AGENCY_NAME}".`);
process.exit(0);
