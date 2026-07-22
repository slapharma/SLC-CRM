import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type { SendHistoryRow } from "@/components/send-history-card";

export type PairSend = { name: string; at: string };

/** Map key for one requirement↔listing pair. */
export const pairKey = (requirementId: string, listingId: string) =>
  `${requirementId}:${listingId}`;

/**
 * Prior external sends for a specific set of requirement↔listing pairs, keyed
 * by `pairKey`. Powers the "Sent ×N" chip and the double-send warning.
 *
 * The lookup is scoped to the pairs actually being rendered — a blanket
 * "newest 500 sends agency-wide" query silently drops old chips once a busy
 * book passes the cap, which reads as "never sent" on exactly the pairings an
 * agent is most likely to re-send.
 */
export async function getPairSendHistory(
  supabase: SupabaseClient<Database>,
  pairs: { requirementId: string; listingId: string }[],
): Promise<Map<string, PairSend[]>> {
  const out = new Map<string, PairSend[]>();
  if (pairs.length === 0) return out;

  const wanted = new Set(pairs.map((p) => pairKey(p.requirementId, p.listingId)));
  const requirementIds = [...new Set(pairs.map((p) => p.requirementId))];
  const listingIds = [...new Set(pairs.map((p) => p.listingId))];

  const { data } = await supabase
    .from("external_sends")
    .select("requirement_id, listing_id, contact_id, recipient_email, created_at")
    .in("requirement_id", requirementIds)
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return out;

  // Recipient display names (the `.in` cross-product may include pairs we
  // didn't ask for — those are dropped below).
  const contactIds = [
    ...new Set(rows.map((r) => r.contact_id).filter((v): v is string => Boolean(v))),
  ];
  const contactName = new Map<string, string>();
  if (contactIds.length) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .in("id", contactIds);
    (contacts ?? []).forEach((c) =>
      contactName.set(
        c.id,
        [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed contact",
      ),
    );
  }

  for (const r of rows) {
    if (!r.requirement_id || !r.listing_id) continue;
    const key = pairKey(r.requirement_id, r.listing_id);
    if (!wanted.has(key)) continue;
    const list = out.get(key) ?? [];
    list.push({
      name: (r.contact_id ? contactName.get(r.contact_id) : null) ?? r.recipient_email,
      at: r.created_at,
    });
    out.set(key, list);
  }
  return out;
}

/**
 * External-send history for one listing or requirement, with recipient/company/
 * sender names and the counterpart record resolved for display.
 */
export async function getSendHistory(
  supabase: SupabaseClient<Database>,
  filter: { listingId?: string; requirementId?: string },
): Promise<SendHistoryRow[]> {
  let query = supabase
    .from("external_sends")
    .select(
      "id, created_at, recipient_email, pdf_kind, sent_by, requirement_id, listing_id, contacts(first_name, last_name), companies(name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (filter.listingId) query = query.eq("listing_id", filter.listingId);
  if (filter.requirementId) query = query.eq("requirement_id", filter.requirementId);
  const { data } = await query;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Sender display names (sent_by is an auth.users id — resolve via profiles).
  const senderIds = [...new Set(rows.map((r) => r.sent_by))];
  const senderName = new Map<string, string>();
  if (senderIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", senderIds);
    (profs ?? []).forEach((p) =>
      senderName.set(p.id, p.full_name ?? p.email ?? "Agent"),
    );
  }

  // Counterpart titles: on a listing page show the paired requirement, and vice versa.
  const counterpartTitle = new Map<string, string>();
  if (filter.listingId) {
    const reqIds = [
      ...new Set(rows.map((r) => r.requirement_id).filter((v): v is string => Boolean(v))),
    ];
    if (reqIds.length) {
      const { data: reqs } = await supabase
        .from("requirements")
        .select("id, title")
        .in("id", reqIds);
      (reqs ?? []).forEach((r) => counterpartTitle.set(r.id, r.title));
    }
  } else if (filter.requirementId) {
    const listingIds = [
      ...new Set(rows.map((r) => r.listing_id).filter((v): v is string => Boolean(v))),
    ];
    if (listingIds.length) {
      const { data: listings } = await supabase
        .from("disposals")
        .select("id, title")
        .in("id", listingIds);
      (listings ?? []).forEach((l) =>
        counterpartTitle.set(l.id, l.title ?? "Untitled listing"),
      );
    }
  }

  return rows.map((r) => {
    const counterpartId = filter.listingId ? r.requirement_id : r.listing_id;
    const counterpartBase = filter.listingId ? "/requirements" : "/listings";
    return {
      id: r.id,
      at: r.created_at,
      recipientName: r.contacts
        ? [r.contacts.first_name, r.contacts.last_name].filter(Boolean).join(" ") || null
        : null,
      recipientEmail: r.recipient_email,
      companyName: r.companies?.name ?? null,
      senderName: senderName.get(r.sent_by) ?? null,
      pdfKind: r.pdf_kind,
      aboutLabel: counterpartId ? (counterpartTitle.get(counterpartId) ?? null) : null,
      aboutHref: counterpartId ? `${counterpartBase}/${counterpartId}` : null,
    };
  });
}
