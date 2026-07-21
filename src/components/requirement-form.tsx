"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { AgentFields } from "@/components/agent-fields";
import {
  CompanyCreatableSelect,
  ContactCreatableSelect,
} from "@/components/creatable-select";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TargetLocationsField } from "@/components/target-locations-field";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/actions/types";
import type { Tables } from "@/lib/database.types";
import type { AgentOption } from "@/lib/supabase/agency";
import { cn } from "@/lib/utils";

type Option = readonly [string, string];

const USE_CLASSES: Option[] = [
  ["E", "Class E"],
  ["sui_generis_pub_bar", "Pub / Bar"],
  ["sui_generis_nightclub", "Nightclub"],
  ["sui_generis_hot_food", "Hot-food takeaway"],
  ["A3", "A3"],
  ["A4", "A4"],
  ["A5", "A5"],
  ["other", "Other"],
];
const TENURES: Option[] = [
  ["freehold", "Freehold"],
  ["leasehold", "Leasehold"],
  ["assignment", "Assignment"],
  ["new_letting", "New letting"],
];
const FITOUTS: Option[] = [
  ["fully_fitted", "Fully fitted"],
  ["part_fitted", "Part fitted"],
  ["shell", "Shell"],
];
const STATUSES: Option[] = [
  ["active", "Active"],
  ["on_hold", "On hold"],
  ["satisfied", "Satisfied"],
  ["withdrawn", "Withdrawn"],
];

export function RequirementForm({
  action,
  requirement,
  companies,
  contacts = [],
  defaultCompanyId,
  agents = [],
  additionalAgentIds,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  requirement?: Tables<"requirements">;
  companies: { id: string; name: string }[];
  contacts?: { id: string; name: string }[];
  defaultCompanyId?: string;
  agents?: AgentOption[];
  additionalAgentIds?: string[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const r = requirement;

  return (
    <form action={formAction} className="space-y-8">
      {r ? <input type="hidden" name="id" value={r.id} /> : null}

      <Section title="Brief">
        <Field label="Title" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={r?.title ?? ""}
            placeholder="e.g. Wet-led bar, Central London"
            required
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <CompanyCreatableSelect
            label="Operator (company)"
            options={companies}
            defaultValue={r?.company_id ?? defaultCompanyId ?? ""}
          />
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={r?.status ?? "active"}>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <ContactCreatableSelect
          name="contact_id"
          label="Contact"
          required
          placeholder="Select a contact…"
          options={contacts}
          defaultValue={r?.contact_id ?? ""}
          hint="Point of contact for this operator — required"
        />
      </Section>

      <Section title="Location → matches disposal town / county / postcode">
        <TargetLocationsField
          towns={r?.target_towns ?? []}
          regions={r?.target_regions ?? []}
          counties={r?.target_counties ?? []}
          districts={r?.target_postcode_districts ?? []}
        />
      </Section>

      <Section title="Property → matches use class / type / size / covers / fit-out">
        <Field
          label="Property types"
          htmlFor="property_types"
          hint="Comma-separated, e.g. Restaurant, Bar"
        >
          <Input
            id="property_types"
            name="property_types"
            defaultValue={(r?.property_types ?? []).join(", ")}
          />
        </Field>
        <CheckboxGroup
          legend="Use classes"
          name="use_classes"
          options={USE_CLASSES}
          selected={r?.use_classes ?? []}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberRange
            label="Size (sq ft)"
            minName="min_sqft"
            maxName="max_sqft"
            minDefault={r?.min_sqft}
            maxDefault={r?.max_sqft}
          />
          <NumberRange
            label="Covers"
            minName="min_covers"
            maxName="max_covers"
            minDefault={r?.min_covers}
            maxDefault={r?.max_covers}
          />
        </div>
        <CheckboxGroup
          legend="Fit-out"
          name="fit_out_prefs"
          options={FITOUTS}
          selected={r?.fit_out_prefs ?? []}
        />
      </Section>

      <Section title="Structure & budget → matches disposal type / rent / premium / guide price">
        <CheckboxGroup
          legend="Tenure"
          name="tenure_prefs"
          options={TENURES}
          selected={r?.tenure_prefs ?? []}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Max rent (£ pa)" htmlFor="max_rent">
            <Input
              id="max_rent"
              name="max_rent"
              type="number"
              inputMode="numeric"
              defaultValue={r?.max_rent ?? ""}
            />
          </Field>
          <Field label="Max premium (£)" htmlFor="max_premium">
            <Input
              id="max_premium"
              name="max_premium"
              type="number"
              inputMode="numeric"
              defaultValue={r?.max_premium ?? ""}
            />
          </Field>
          <Field label="Max guide price (£)" htmlFor="max_guide_price" hint="Freehold budget">
            <Input
              id="max_guide_price"
              name="max_guide_price"
              type="number"
              inputMode="numeric"
              defaultValue={r?.max_guide_price ?? ""}
            />
          </Field>
        </div>
      </Section>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={r?.notes ?? ""} />
      </Field>

      <AgentFields
        agents={agents}
        leadAgentId={r?.lead_agent_id}
        additionalAgentIds={additionalAgentIds}
      />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : r ? "Save changes" : "Create requirement"}
        </Button>
        <Link
          href={r ? `/requirements/${r.id}` : "/requirements"}
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: Option[];
  selected: readonly string[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={v}
              defaultChecked={selected.includes(v)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NumberRange({
  label,
  minName,
  maxName,
  minDefault,
  maxDefault,
}: {
  label: string;
  minName: string;
  maxName: string;
  minDefault?: number | null;
  maxDefault?: number | null;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${minName}-input`} className="text-xs text-muted-foreground">
            Min
          </Label>
          <Input
            id={`${minName}-input`}
            name={minName}
            type="number"
            inputMode="numeric"
            placeholder="Min"
            defaultValue={minDefault ?? ""}
          />
        </div>
        <span className="pb-2 text-muted-foreground">–</span>
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${maxName}-input`} className="text-xs text-muted-foreground">
            Max
          </Label>
          <Input
            id={`${maxName}-input`}
            name={maxName}
            type="number"
            inputMode="numeric"
            placeholder="Max"
            defaultValue={maxDefault ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
