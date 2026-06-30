"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { AgentFields } from "@/components/agent-fields";
import { ContactCreatableSelect, type EntityOption } from "@/components/creatable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/actions/types";
import type { Tables } from "@/lib/database.types";
import type { AgentOption } from "@/lib/supabase/agency";
import { cn } from "@/lib/utils";

const TYPES = [
  ["operator", "Operator"],
  ["landlord", "Landlord"],
  ["agent", "Agent"],
  ["vendor", "Vendor"],
  ["other", "Other"],
] as const;

export function CompanyForm({
  action,
  company,
  agents,
  additionalAgentIds,
  contacts = [],
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  company?: Tables<"companies">;
  agents: AgentOption[];
  additionalAgentIds?: string[];
  contacts?: EntityOption[];
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
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
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
        <Field label="Town / city" htmlFor="city">
          <Input id="city" name="city" defaultValue={company?.city ?? ""} />
        </Field>
        <Field label="Postcode" htmlFor="postcode">
          <Input id="postcode" name="postcode" defaultValue={company?.postcode ?? ""} />
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

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

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
