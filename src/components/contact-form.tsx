"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { AgentFields } from "@/components/agent-fields";
import { CompanyCreatableSelect } from "@/components/creatable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/actions/types";
import type { Tables } from "@/lib/database.types";
import type { AgentOption } from "@/lib/supabase/agency";
import { cn } from "@/lib/utils";

export function ContactForm({
  action,
  contact,
  companies,
  defaultCompanyId,
  agents,
  additionalAgentIds,
  roles,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  contact?: Tables<"contacts">;
  companies: { id: string; name: string }[];
  defaultCompanyId?: string;
  agents: AgentOption[];
  additionalAgentIds?: string[];
  roles: { slug: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const c = contact;

  return (
    <form action={formAction} className="space-y-5">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" htmlFor="first_name" required>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={c?.first_name ?? ""}
            required
          />
        </Field>
        <Field label="Last name" htmlFor="last_name">
          <Input id="last_name" name="last_name" defaultValue={c?.last_name ?? ""} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={c?.role ?? "other"}>
            {roles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <CompanyCreatableSelect
          options={companies}
          defaultValue={c?.company_id ?? defaultCompanyId ?? ""}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={c?.email ?? ""} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={c?.phone ?? ""} />
        </Field>
      </div>

      <Field label="Address" htmlFor="address_line">
        <Input
          id="address_line"
          name="address_line"
          placeholder="Street address"
          defaultValue={c?.address_line ?? ""}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Town / city" htmlFor="city">
          <Input id="city" name="city" defaultValue={c?.city ?? ""} />
        </Field>
        <Field label="Postcode" htmlFor="postcode">
          <Input id="postcode" name="postcode" defaultValue={c?.postcode ?? ""} />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={c?.notes ?? ""} />
      </Field>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="marketing_opt_in"
          defaultChecked={c?.marketing_opt_in ?? false}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        Approves receiving marketing communications
      </label>

      <AgentFields
        agents={agents}
        leadAgentId={c?.lead_agent_id}
        additionalAgentIds={additionalAgentIds}
      />

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : c ? "Save changes" : "Create contact"}
        </Button>
        <Link
          href={c ? `/contacts/${c.id}` : "/contacts"}
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
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
