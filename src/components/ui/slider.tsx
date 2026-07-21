"use client";

import * as React from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Labelled native range input for GET filter forms and settings. Uncontrolled
 * (defaultValue) so it submits like any other form field; shows the live value
 * beside the label via formatValue.
 */
export function Slider({
  name,
  label,
  min = 0,
  max = 100,
  step = 1,
  defaultValue,
  formatValue,
  className,
}: {
  name: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <label className={cn("flex flex-col gap-1 text-xs text-muted-foreground", className)}>
      <span className="flex items-center justify-between gap-2">
        {label}
        <span className="font-medium tabular-nums text-foreground">
          {formatValue ? formatValue(value) : value}
        </span>
      </span>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        onInput={(e) => setValue(Number(e.currentTarget.value))}
        className="h-9 w-40 cursor-pointer accent-primary"
      />
    </label>
  );
}
