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
import { LocationSelect } from "@/components/location-select";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/actions/types";
import type { Tables } from "@/lib/database.types";
import type { AgentOption } from "@/lib/supabase/agency";
import { cn } from "@/lib/utils";

type Option = readonly [string, string];

const STATUSES: Option[] = [
  ["Available", "Available"],
  ["Under Offer", "Under Offer"],
  ["Let", "Let"],
  ["Sold", "Sold"],
  ["Withdrawn", "Withdrawn"],
];
const DISPOSAL_TYPES: Option[] = [
  ["unknown", "Unspecified"],
  ["freehold", "Freehold"],
  ["new_lease", "New lease"],
  ["lease_assignment", "Lease assignment"],
  ["sublease", "Sublease"],
];
const FIT_OUTS: Option[] = [
  ["", "—"],
  ["fully_fitted", "Fully fitted"],
  ["part_fitted", "Part fitted"],
  ["shell", "Shell"],
];
const LISTING_TYPES: Option[] = [
  ["cdg", "CDG — our instruction"],
  ["intel", "INTEL — market intelligence"],
];

type PickOption = { id: string; name: string };

export function DisposalForm({
  action,
  disposal,
  agents,
  additionalAgentIds,
  companies = [],
  contacts = [],
  defaultCompanyId,
  defaultContactId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  disposal?: Tables<"disposals">;
  agents: AgentOption[];
  additionalAgentIds?: string[];
  companies?: PickOption[];
  contacts?: PickOption[];
  defaultCompanyId?: string;
  defaultContactId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const d = disposal;

  return (
    <form action={formAction} className="space-y-8">
      {d ? <input type="hidden" name="id" value={d.id} /> : null}

      <Section title="Listing">
        <Field label="Title" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            defaultValue={d?.title ?? ""}
            placeholder="e.g. Corner bar, Soho"
            required
          />
        </Field>
        <Field
          label="Type"
          htmlFor="listing_type"
          hint="INTEL listings produce an unbranded PDF (no CDG branding)."
        >
          <Select
            id="listing_type"
            name="listing_type"
            defaultValue={d?.listing_type ?? "cdg"}
          >
            {LISTING_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={d?.status ?? "Available"}>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Disposal type" htmlFor="disposal_type">
            <Select
              id="disposal_type"
              name="disposal_type"
              defaultValue={d?.disposal_type ?? "unknown"}
            >
              {DISPOSAL_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox name="to_let" label="To let" defaultChecked={d?.to_let ?? false} />
          <Checkbox name="for_sale" label="For sale" defaultChecked={d?.for_sale ?? false} />
        </div>
      </Section>

      <Section title="Location">
        <Field label="Address" htmlFor="address_line">
          <Input id="address_line" name="address_line" defaultValue={d?.address_line ?? ""} />
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Area" htmlFor="area">
            <Input id="area" name="area" defaultValue={d?.area ?? ""} />
          </Field>
          <LocationSelect
            name="city"
            label="Town / city"
            kinds={["town"]}
            defaultValue={d?.city ?? ""}
          />
          <LocationSelect
            name="county"
            label="County"
            kinds={["county"]}
            defaultValue={d?.county ?? ""}
            hint="Auto-filled from postcode/town if left blank"
          />
          <LocationSelect
            name="postcode"
            label="Postcode"
            kinds={["district"]}
            defaultValue={d?.postcode ?? ""}
            placeholder="e.g. W1D 3QF"
          />
        </div>
      </Section>

      <Section title="Premises">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Property type" htmlFor="property_type">
            <Input
              id="property_type"
              name="property_type"
              placeholder="e.g. Restaurant, Bar"
              defaultValue={d?.property_type ?? ""}
            />
          </Field>
          <Field label="Use class" htmlFor="use_class">
            <Input
              id="use_class"
              name="use_class"
              placeholder="e.g. Class E, Sui Generis"
              defaultValue={d?.use_class ?? ""}
            />
          </Field>
          <Field label="Size (sq ft)" htmlFor="size_sqft">
            <Input id="size_sqft" name="size_sqft" type="number" inputMode="numeric" defaultValue={d?.size_sqft ?? ""} />
          </Field>
          <Field label="Size (sq m)" htmlFor="size_sqm">
            <Input id="size_sqm" name="size_sqm" type="number" inputMode="numeric" defaultValue={d?.size_sqm ?? ""} />
          </Field>
          <Field label="Covers — internal" htmlFor="covers_internal">
            <Input id="covers_internal" name="covers_internal" type="number" inputMode="numeric" defaultValue={d?.covers_internal ?? ""} />
          </Field>
          <Field label="Covers — external" htmlFor="covers_external">
            <Input id="covers_external" name="covers_external" type="number" inputMode="numeric" defaultValue={d?.covers_external ?? ""} />
          </Field>
          <Field label="Fit-out" htmlFor="fit_out_state">
            <Select id="fit_out_state" name="fit_out_state" defaultValue={d?.fit_out_state ?? ""}>
              {FIT_OUTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="EPC rating" htmlFor="epc_rating">
            <Input id="epc_rating" name="epc_rating" defaultValue={d?.epc_rating ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Commercials">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Rent (£ pa)" htmlFor="rent_pa">
            <Input id="rent_pa" name="rent_pa" type="number" inputMode="numeric" defaultValue={d?.rent_pa ?? ""} />
          </Field>
          <Field label="Premium (£)" htmlFor="premium">
            <Input id="premium" name="premium" type="number" inputMode="numeric" defaultValue={d?.premium ?? ""} />
          </Field>
          <Field label="Guide price (£)" htmlFor="guide_price">
            <Input id="guide_price" name="guide_price" type="number" inputMode="numeric" defaultValue={d?.guide_price ?? ""} />
          </Field>
          <Field label="Rateable value (£)" htmlFor="rateable_value">
            <Input id="rateable_value" name="rateable_value" type="number" inputMode="numeric" defaultValue={d?.rateable_value ?? ""} />
          </Field>
          <Field label="Service charge (£)" htmlFor="service_charge">
            <Input id="service_charge" name="service_charge" type="number" inputMode="numeric" defaultValue={d?.service_charge ?? ""} />
          </Field>
          <Field label="Tenure" htmlFor="tenure_raw">
            <Input id="tenure_raw" name="tenure_raw" placeholder="e.g. New 15-year lease" defaultValue={d?.tenure_raw ?? ""} />
          </Field>
        </div>
      </Section>

      <Section title="Detail">
        <Field label="Key features" htmlFor="key_features" hint="Comma-separated">
          <Input
            id="key_features"
            name="key_features"
            defaultValue={(d?.key_features ?? []).join(", ")}
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={d?.description ?? ""} />
        </Field>
      </Section>

      <Section title="Links">
        <div className="grid gap-5 sm:grid-cols-2">
          <CompanyCreatableSelect
            options={companies}
            defaultValue={d?.company_id ?? defaultCompanyId ?? ""}
            hint="Landlord / vendor / marketing company — optional"
          />
          <ContactCreatableSelect
            name="contact_id"
            label="Contact"
            required
            placeholder="Select a contact…"
            options={contacts}
            defaultValue={d?.contact_id ?? defaultContactId ?? ""}
            hint="Point of contact for this listing — required"
          />
        </div>
      </Section>

      <Section title="Assignment">
        <AgentFields
          agents={agents}
          leadAgentId={d?.lead_agent_id}
          additionalAgentIds={additionalAgentIds}
        />
      </Section>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : d ? "Save changes" : "Create listing"}
        </Button>
        <Link
          href={d ? `/listings/${d.id}` : "/listings"}
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}
