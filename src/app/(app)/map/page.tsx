import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConcentrationMap } from "@/components/concentration-map-lazy";
import { createClient } from "@/lib/supabase/server";
import { getMapLayers } from "@/lib/supabase/map-points";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const supabase = await createClient();
  const layers = await getMapLayers(supabase);

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
