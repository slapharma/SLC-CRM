import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ConcentrationMap,
  type MapLayers,
  type MapPoint,
} from "@/components/concentration-map";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Map" };

type ImageItem = { url: string; alt?: string | null };

type Addr = {
  address_line: string | null;
  city: string | null;
  postcode: string | null;
};
const addressOf = (a: Addr) =>
  [a.address_line, a.city, a.postcode].filter(Boolean).join(", ");

export default async function MapPage() {
  const supabase = await createClient();

  const [{ data: disposals }, { data: companies }, { data: contacts }] =
    await Promise.all([
      supabase
        .from("disposals")
        .select("id, title, status, address_line, city, postcode, images, lat, lng"),
      supabase
        .from("companies")
        .select("id, name, type, address_line, city, postcode, lat, lng"),
      supabase
        .from("contacts")
        .select(
          "id, first_name, last_name, role, address_line, city, postcode, lat, lng, company_id",
        ),
    ]);

  // Company coords (+ address) so contacts without their own location can fall
  // back to their company's pin.
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

  const layers: MapLayers = {
    listings,
    companies: companyPoints,
    contacts: contactPoints,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Location map</h1>
        <p className="text-sm text-muted-foreground">
          Where your listings, companies and contacts are across the UK.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Every geocoded record, pinned on the map. Click a pin for its card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConcentrationMap layers={layers} />
        </CardContent>
      </Card>
    </div>
  );
}
