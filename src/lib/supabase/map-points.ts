import type { SupabaseClient } from "@supabase/supabase-js";

import type { MapKind, MapLayers, MapPoint } from "@/components/concentration-map";
import type { Database } from "@/lib/database.types";

type ImageItem = { url: string; alt?: string | null };

type Addr = {
  address_line: string | null;
  city: string | null;
  postcode: string | null;
};
const addressOf = (a: Addr) =>
  [a.address_line, a.city, a.postcode].filter(Boolean).join(", ");

/**
 * Build the geocoded map layers (listings / companies / contacts) for the
 * ConcentrationMap. Shared by the /map page (needs all three) and the
 * per-record list pages (each only renders its own category) — pass `include`
 * to skip querying tables the caller won't render. Contacts without their own
 * coords fall back to their company's pin, so companies are still fetched
 * (but not returned) whenever contacts are requested. RLS scopes every query
 * by agency.
 */
export async function getMapLayers(
  supabase: SupabaseClient<Database>,
  opts: { include?: MapKind[] } = {},
): Promise<MapLayers> {
  const include = new Set(opts.include ?? ["listing", "company", "contact"]);
  const wantListings = include.has("listing");
  const wantContacts = include.has("contact");
  // Company rows are also needed (but not returned) to resolve the
  // contact-falls-back-to-company-pin case.
  const wantCompanyRows = include.has("company") || wantContacts;

  const emptyRows = Promise.resolve({ data: [] });
  const [{ data: disposals }, { data: companies }, { data: contacts }] =
    await Promise.all([
      wantListings
        ? supabase
            .from("disposals")
            .select("id, title, status, address_line, city, postcode, images, lat, lng")
        : emptyRows,
      wantCompanyRows
        ? supabase
            .from("companies")
            .select("id, name, type, address_line, city, postcode, lat, lng")
        : emptyRows,
      wantContacts
        ? supabase
            .from("contacts")
            .select(
              "id, first_name, last_name, role, address_line, city, postcode, lat, lng, company_id",
            )
        : emptyRows,
    ]);

  const companyCoord = new Map<string, { lat: number; lng: number; address: string }>();
  for (const c of companies ?? []) {
    if (c.lat != null && c.lng != null) {
      companyCoord.set(c.id, { lat: c.lat, lng: c.lng, address: addressOf(c) });
    }
  }

  const listings: MapPoint[] = (disposals ?? [])
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => ({
      id: d.id,
      kind: "listing",
      name: d.title ?? "Untitled listing",
      subtitle: d.status,
      address: addressOf(d),
      image: (Array.isArray(d.images) ? (d.images as ImageItem[])[0]?.url : null) ?? null,
      lat: d.lat as number,
      lng: d.lng as number,
    }));

  const companyPoints: MapPoint[] = (companies ?? [])
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({
      id: c.id,
      kind: "company",
      name: c.name,
      subtitle: c.type,
      address: addressOf(c),
      lat: c.lat as number,
      lng: c.lng as number,
    }));

  const contactPoints: MapPoint[] = (contacts ?? [])
    .map((c): MapPoint | null => {
      const own = c.lat != null && c.lng != null;
      const fallback = !own && c.company_id ? companyCoord.get(c.company_id) : undefined;
      if (!own && !fallback) return null;
      return {
        id: c.id,
        kind: "contact",
        name: [c.first_name, c.last_name].filter(Boolean).join(" "),
        subtitle: c.role,
        address: own ? addressOf(c) : (fallback?.address ?? null),
        lat: own ? (c.lat as number) : fallback!.lat,
        lng: own ? (c.lng as number) : fallback!.lng,
      };
    })
    .filter((p): p is MapPoint => p !== null);

  return {
    listings,
    companies: include.has("company") ? companyPoints : [],
    contacts: contactPoints,
  };
}
