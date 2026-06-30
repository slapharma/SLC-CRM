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
  type GeoPoint,
  type MapLayers,
} from "@/components/concentration-map";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Map" };

type Row = { lat: number | null; lng: number | null };

const geocoded = (rows: Row[] | null): GeoPoint[] =>
  (rows ?? [])
    .filter((r): r is { lat: number; lng: number } => r.lat != null && r.lng != null)
    .map((r) => ({ lat: r.lat, lng: r.lng }));

export default async function MapPage() {
  const supabase = await createClient();

  const [{ data: disposals }, { data: companies }, { data: contacts }] =
    await Promise.all([
      supabase.from("disposals").select("lat, lng"),
      supabase.from("companies").select("id, lat, lng"),
      supabase.from("contacts").select("lat, lng, company_id"),
    ]);

  // Contacts without their own coords fall back to their company's location.
  const companyCoord = new Map<string, { lat: number; lng: number }>();
  for (const c of companies ?? []) {
    if (c.lat != null && c.lng != null) {
      companyCoord.set(c.id, { lat: c.lat, lng: c.lng });
    }
  }
  const contactPoints: GeoPoint[] = (contacts ?? [])
    .map((c) => {
      if (c.lat != null && c.lng != null) return { lat: c.lat, lng: c.lng };
      return c.company_id ? companyCoord.get(c.company_id) : undefined;
    })
    .filter((p): p is GeoPoint => Boolean(p));

  const layers: MapLayers = {
    listings: geocoded(disposals),
    companies: geocoded(companies),
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
            Every geocoded record, pinned on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConcentrationMap layers={layers} />
        </CardContent>
      </Card>
    </div>
  );
}
