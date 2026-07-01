"use client";

import * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateContactRole } from "@/lib/actions/admin";

export type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string;
};

const ROLES: { value: string; label: string }[] = [
  { value: "acquisitions", label: "Acquisitions" },
  { value: "landlord", label: "Landlord" },
  { value: "solicitor", label: "Solicitor" },
  { value: "agent", label: "Agent" },
  { value: "finance", label: "Finance" },
  { value: "other", label: "Other" },
];

/**
 * Admin contact-role editor (#2). Lists the agency's contacts with a per-row
 * role picker that auto-submits on change to the `updateContactRole` action.
 */
export function ContactRolesPanel({ contacts }: { contacts: ContactRow[] }) {
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.email ?? "").toLowerCase().includes(needle) ||
          (c.company ?? "").toLowerCase().includes(needle),
      )
    : contacts;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Contact roles</CardTitle>
        <CardDescription>
          Change any contact&apos;s role. Saves as soon as you pick a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="search"
          placeholder="Search contacts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts match.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.company, c.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <form action={updateContactRole} className="shrink-0">
                  <input type="hidden" name="contact_id" value={c.id} />
                  <Select
                    name="role"
                    defaultValue={c.role}
                    className="w-40"
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
