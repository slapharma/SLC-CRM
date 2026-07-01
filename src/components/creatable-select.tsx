"use client";

import * as React from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { quickCreateCompany } from "@/lib/actions/companies";
import { quickCreateContact } from "@/lib/actions/contacts";
import type { FormState } from "@/lib/actions/types";

export type EntityOption = { id: string; name: string };

/**
 * A labelled <select> bound to a parent form, plus a "+ New …" button that opens
 * a modal to quick-create a related record. On success the new record is added to
 * the options and selected. The modal is portalled to <body>, so its <form> never
 * nests inside the parent form.
 */
export function CreatableSelect({
  name,
  label,
  placeholder = "— None —",
  options: initial,
  defaultValue = "",
  required,
  hint,
  action,
  modalTitle,
  createLabel,
  children,
}: {
  name: string;
  label: string;
  placeholder?: string;
  options: EntityOption[];
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  modalTitle: string;
  createLabel: string;
  children: React.ReactNode;
}) {
  const [options, setOptions] = useState<EntityOption[]>(initial);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const lastCreated = useRef<string | null>(null);

  useEffect(() => {
    const c = state.created;
    if (c && c.id !== lastCreated.current) {
      lastCreated.current = c.id;
      setOptions((prev) =>
        prev.some((o) => o.id === c.id)
          ? prev
          : [...prev, { id: c.id, name: c.name }].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
      );
      setValue(c.id);
      setOpen(false);
    }
  }, [state.created]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="flex items-center gap-2">
        <Select
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required={required}
          className="flex-1"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <Plus />
          New
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <Modal open={open} onClose={() => setOpen(false)} title={modalTitle}>
        <form action={formAction} className="space-y-4">
          {children}
          {state.error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : createLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/** Company picker with inline "+ New company" modal (#12, #14). */
export function CompanyCreatableSelect({
  name = "company_id",
  label = "Company",
  options,
  defaultValue,
  required,
  hint,
  placeholder,
}: {
  name?: string;
  label?: string;
  options: EntityOption[];
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <CreatableSelect
      name={name}
      label={label}
      options={options}
      defaultValue={defaultValue}
      required={required}
      hint={hint}
      placeholder={placeholder}
      action={quickCreateCompany}
      modalTitle="New company"
      createLabel="Create company"
    >
      <div className="space-y-2">
        <Label htmlFor="qc-company-name">
          Company name<span className="text-destructive"> *</span>
        </Label>
        <Input id="qc-company-name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="qc-company-type">Type</Label>
        <Select id="qc-company-type" name="type" defaultValue="operator">
          <option value="operator">Operator</option>
          <option value="landlord">Landlord</option>
          <option value="agent">Agent</option>
          <option value="vendor">Vendor</option>
          <option value="other">Other</option>
        </Select>
      </div>
    </CreatableSelect>
  );
}

/** Contact picker with inline "+ New contact" modal (#13). */
export function ContactCreatableSelect({
  name = "link_contact",
  label = "Contact",
  options,
  defaultValue,
  required,
  hint,
  placeholder,
}: {
  name?: string;
  label?: string;
  options: EntityOption[];
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <CreatableSelect
      name={name}
      label={label}
      options={options}
      defaultValue={defaultValue}
      required={required}
      hint={hint}
      placeholder={placeholder}
      action={quickCreateContact}
      modalTitle="New contact"
      createLabel="Create contact"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="qc-contact-first">
            First name<span className="text-destructive"> *</span>
          </Label>
          <Input id="qc-contact-first" name="first_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qc-contact-last">Last name</Label>
          <Input id="qc-contact-last" name="last_name" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qc-contact-email">Email</Label>
        <Input id="qc-contact-email" name="email" type="email" />
      </div>
    </CreatableSelect>
  );
}
