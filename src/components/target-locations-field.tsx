"use client";

import * as React from "react";
import { useMemo } from "react";

import { LocationMultiPicker, type PickedLocation } from "@/components/location-select";
import { classifyLocation, type LocationKind } from "@/lib/locations/options";

/**
 * Unified "Target locations" field for the requirement form: one searchable
 * multi-select across towns, counties, regions and postcode districts,
 * partitioned into the four requirement array columns via hidden inputs.
 */
export function TargetLocationsField({
  towns = [],
  regions = [],
  counties = [],
  districts = [],
}: {
  towns?: readonly string[];
  regions?: readonly string[];
  counties?: readonly string[];
  districts?: readonly string[];
}) {
  const defaultSelected = useMemo(() => {
    const seed = (values: readonly string[], stored: LocationKind): PickedLocation[] =>
      values
        .filter((v) => v.trim())
        // Legacy free-text values may be misfiled (e.g. "W1" saved as a town) —
        // reclassify against the dataset, falling back to the stored kind.
        .map((v) => ({ kind: classifyLocation(v) ?? stored, value: v }));
    const all = [
      ...seed(towns, "town"),
      ...seed(counties, "county"),
      ...seed(regions, "region"),
      ...seed(districts, "district"),
    ];
    return all.filter(
      (p, i) => all.findIndex((q) => q.value.toLowerCase() === p.value.toLowerCase()) === i,
    );
  }, [towns, regions, counties, districts]);

  return (
    <LocationMultiPicker
      idBase="target-locations"
      label="Target locations"
      kinds={["town", "county", "region", "district"]}
      namesByKind={{
        town: "target_towns",
        county: "target_counties",
        region: "target_regions",
        district: "target_postcode_districts",
      }}
      defaultSelected={defaultSelected}
      hint='Towns, counties (incl. "Home Counties"), regions or postcode districts (e.g. W1). Unlisted places can be typed freely.'
    />
  );
}
