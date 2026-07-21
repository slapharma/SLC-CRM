"use client";

import { Slider } from "@/components/ui/slider";

/**
 * The MatchMaker "Location flexibility" slider (?flex=). A client wrapper so
 * server pages don't have to pass a formatter function across the RSC boundary.
 */
export function LocationFlexSlider({ defaultValue }: { defaultValue: number }) {
  return (
    <Slider
      name="flex"
      label="Location flexibility"
      min={0}
      max={100}
      step={10}
      defaultValue={defaultValue}
      formatValue={(v) => (v === 0 ? "Exact only" : `~${Math.round((v / 100) * 25)} mi`)}
    />
  );
}
