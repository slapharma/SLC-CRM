"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { AgentFields } from "@/components/agent-fields";
import { ContactCreatableSelect, type EntityOption } from "@/components/creatable-select";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSelect } from "@/components/location-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/actions/types";
import type { Tables } from "@/lib/database.types";
import type { AgentOption } from "@/lib/supabase/agency";
import { cn } from "@/lib/utils";

export function CompanyForm({
  action,
  company,
  agents,
  additionalAgentIds,
  contacts = [],
  types = [],
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  company?: Tables<"companies">;
  agents: AgentOption[];
  additionalAgentIds?: string[];
  contacts?: EntityOption[];
  types?: { slug: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {company ? <input type="hidden" name="id" value={company.id} /> : null}

      <Field label="Company name" htmlFor="name" required>
        <Input id="name" name="name" defaultValue={company?.name ?? ""} required />
      </Field>

      <Field label="Type" htmlFor="type">
        <Select id="type" name="type" defaultValue={company?.type ?? "operator"}>
          {types.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Sector tags"
        htmlFor="sector_tags"
        hint="Comma-separated, e.g. pub, bar, restaurant"
      >
        <Input
          id="sector_tags"
          name="sector_tags"
          defaultValue={(company?.sector_tags ?? []).join(", ")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Website" htmlFor="website">
          <Input
            id="website"
            name="website"
            type="url"
            placeholder="https://"
            defaultValue={company?.website ?? ""}
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={company?.phone ?? ""} />
        </Field>
      </div>

      <Field
        label="Address"
        htmlFor="address_line"
        hint="Used to place the company on the map"
      >
        <Input
          id="address_line"
          name="address_line"
          placeholder="Street address"
          defaultValue={company?.address_line ?? ""}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <LocationSelect
          name="city"
          label="Town / city"
          kinds={["town"]}
          defaultValue={company?.city ?? ""}
        />
        <LocationSelect
          name="postcode"
          label="Postcode"
          kinds={["district"]}
          defaultValue={company?.postcode ?? ""}
        />
        <LocationSelect
          name="county"
          label="County"
          kinds={["county"]}
          defaultValue={company?.county ?? ""}
          hint="Auto-filled from postcode/town if left blank"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Companies House number (CRN)"
          htmlFor="company_number"
          hint="Used for KYC checks against Companies House"
        >
          <Input
            id="company_number"
            name="company_number"
            placeholder="e.g. 01234567"
            defaultValue={company?.company_number ?? ""}
          />
        </Field>
        <Field label="VAT number" htmlFor="vat_number">
          <Input
            id="vat_number"
            name="vat_number"
            placeholder="e.g. GB123456789"
            defaultValue={company?.vat_number ?? ""}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={company?.notes ?? ""} />
      </Field>

      {!company ? (
        <ContactCreatableSelect label="Add contact" options={contacts} />
      ) : null}

      <AgentFields
        agents={agents}
        leadAgentId={company?.lead_agent_id}
        additionalAgentIds={additionalAgentIds}
      />

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : company ? "Save changes" : "Create company"}
        </Button>
        <Link
          href={company ? `/companies/${company.id}` : "/companies"}
          className={cn(buttonVariants({ variant: "secondary" }))}
        >
          Cancel
        </Link>
      </div>
    </form>
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
