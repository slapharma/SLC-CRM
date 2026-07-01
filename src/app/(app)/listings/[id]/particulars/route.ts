import { createElement, type ReactElement } from "react";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/server";
import { staticMapUrl } from "@/lib/maps/static-map";
import { registerBrandFonts } from "@/lib/pdf/fonts";
import {
  ParticularsDocument,
  type ParticularsData,
  type DocSection,
  type FloorRow,
} from "@/lib/pdf/particulars-document";

// react-pdf and the bundled TTFs need the Node runtime (not Edge).
export const runtime = "nodejs";

type ImageItem = { url: string; alt?: string | null };

const money = (v: number | null) =>
  v != null ? `£${Number(v).toLocaleString("en-GB")}` : null;

// Section titles already rendered from dedicated columns — drop duplicates that
// the marketing scrape may also carry, so they aren't printed twice.
const COVERED = /^(summary|description|location|accommodation|tenure|asking\s*rent|rent|premium|vat|planning|licen[cs]|confidential|holding\s*deposit|key\s*features?)/i;

async function fetchHero(images: ImageItem[]): Promise<Buffer | null> {
  const url = images[0]?.url;
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Static Maps PNG of the listing location (null when no coords or no server key).
async function fetchStaticMap(
  lat: number | null,
  lng: number | null,
): Promise<Buffer | null> {
  if (lat == null || lng == null) return null;
  const url = staticMapUrl(lat, lng);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function buildData(
  d: Record<string, unknown>,
  hero: Buffer | null,
  map: Buffer | null,
  agents: string[],
): ParticularsData {
  const g = <T,>(k: string) => d[k] as T;

  const toLet = g<boolean>("to_let");
  const forSale = g<boolean>("for_sale");
  const statusTag =
    toLet && forSale ? "To Let / For Sale" : forSale ? "For Sale" : "To Let";

  const postcode = g<string | null>("postcode");
  const address = [g<string | null>("address_line"), g<string | null>("city"), postcode]
    .filter(Boolean)
    .join(", ");

  const sqft = g<number | null>("size_sqft");
  const sqm = g<number | null>("size_sqm");
  const sizeLine = sqft != null ? `${sqft.toLocaleString("en-GB")} sq ft` : null;
  const sizeSub = sqm != null ? `(${sqm.toLocaleString("en-GB")} sq m)` : null;

  // Premium: prefer the raw scrape text; fall back to the numeric value.
  const premiumRaw = g<string | null>("premium_raw");
  const premiumNum = g<number | null>("premium");
  const isNilPremium =
    premiumNum === 0 || (premiumRaw != null && /\bnil\b/i.test(premiumRaw));
  const premium = premiumRaw ?? (isNilPremium ? "Nil" : money(premiumNum));
  const premiumTag = isNilPremium
    ? "NIL PREMIUM"
    : premiumNum != null && premiumNum > 0
      ? `${money(premiumNum)} PREMIUM`
      : null;

  // Asking rent: prefer raw text, else compose from numeric fields.
  const rentRaw = g<string | null>("rent_raw");
  const rentPa = g<number | null>("rent_pa");
  const rentPeriod = g<string | null>("rent_period");
  const askingRent =
    rentRaw ??
    (rentPa != null
      ? `${money(rentPa)} ${rentPeriod ?? "per annum"} exclusive.`
      : null);

  const rawSections = (Array.isArray(d.sections) ? d.sections : []) as DocSection[];
  const sections = rawSections.filter(
    (s) => s?.title && s?.content && !COVERED.test(s.title.trim()),
  );

  return {
    intel: g<string | null>("listing_type") === "intel",
    statusTag,
    title: g<string | null>("title") ?? "Property",
    address,
    postcode,
    premiumTag,
    summary: g<string | null>("summary"),
    sizeLine,
    sizeSub,
    keyFeatures: (g<string[] | null>("key_features") ?? []).filter(Boolean),
    availableSize: sizeLine,
    epc: g<string | null>("epc_rating"),
    description: g<string | null>("description"),
    location: g<string | null>("location_description"),
    floors: (Array.isArray(d.floors) ? d.floors : []) as FloorRow[],
    tenure: g<string | null>("tenure_raw"),
    askingRent,
    premium,
    vat: g<boolean | null>("vat_applicable")
      ? "May be applicable to the premium and rent."
      : null,
    licensing: g<string | null>("licensing_notes"),
    sections,
    agentName: g<string | null>("agent_name"),
    agentPhone: g<string | null>("agent_phone"),
    agentEmail: g<string | null>("agent_email"),
    agents,
    generatedOn: new Date().toLocaleDateString("en-GB"),
    heroImage: hero,
    mapImage: map,
  };
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "particulars";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: row } = await supabase
    .from("disposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return new Response("Not found", { status: 404 });

  // Internal CDG team assigned to this listing (lead first, then collaborators).
  const { data: agentRows } = await supabase
    .from("disposal_agents")
    .select("user_id")
    .eq("disposal_id", id);
  const orderedIds = [
    row.lead_agent_id,
    ...(agentRows ?? []).map((a) => a.user_id),
  ].filter((v): v is string => Boolean(v));
  let agentNames: string[] = [];
  if (orderedIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...new Set(orderedIds)]);
    const nameOf = new Map(
      (profs ?? []).map((p) => [p.id, p.full_name ?? p.email ?? "Agent"]),
    );
    const seen = new Set<string>();
    agentNames = orderedIds
      .filter((uid) => !seen.has(uid) && seen.add(uid))
      .map((uid) => nameOf.get(uid) ?? "Agent");
  }

  registerBrandFonts();
  const images = (Array.isArray(row.images) ? row.images : []) as ImageItem[];
  const [hero, map] = await Promise.all([
    fetchHero(images),
    fetchStaticMap(row.lat, row.lng),
  ]);
  const data = buildData(row as Record<string, unknown>, hero, map, agentNames);

  // ParticularsDocument renders a <Document> at runtime; createElement loses
  // that in the type system, so assert the element shape renderToBuffer wants.
  const element = createElement(ParticularsDocument, {
    d: data,
  }) as unknown as ReactElement<DocumentProps>;
  const pdf = await renderToBuffer(element);
  const filename = `${slug(data.title)}-particulars.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
