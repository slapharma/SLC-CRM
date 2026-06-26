import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  companyTypeBadge,
  contactRoleBadge,
  requirementStatusBadge,
} from "@/lib/badges";
import { deleteCompany } from "@/lib/actions/companies";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, role, email")
    .eq("company_id", id)
    .order("first_name");

  const { data: requirements } = await supabase
    .from("requirements")
    .select("id, title, status")
    .eq("company_id", id)
    .order("title");

  const t = companyTypeBadge(company.type);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <Badge tone={t.tone}>{t.label}</Badge>
          </div>
          {company.sector_tags.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {company.sector_tags.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            <Pencil />
            Edit
          </Link>
          <form action={deleteCompany}>
            <input type="hidden" name="id" value={company.id} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Website">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Phone">{company.phone ?? "—"}</Detail>
            <Detail label="Notes">
              <span className="whitespace-pre-wrap">{company.notes ?? "—"}</span>
            </Detail>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {(contacts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {contacts!.map((ct) => {
                  const r = contactRoleBadge(ct.role);
                  return (
                    <li
                      key={ct.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium">
                        {[ct.first_name, ct.last_name].filter(Boolean).join(" ")}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={r.tone}>{r.label}</Badge>
                        {ct.email ? (
                          <span className="text-muted-foreground">{ct.email}</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Requirements</CardTitle>
          <Link
            href={`/requirements/new?company=${company.id}`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            <Plus />
            Add requirement
          </Link>
        </CardHeader>
        <CardContent>
          {(requirements ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No acquisition requirements yet.
            </p>
          ) : (
            <ul className="divide-y">
              {requirements!.map((rq) => {
                const rs = requirementStatusBadge(rq.status);
                return (
                  <li
                    key={rq.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <Link
                      href={`/requirements/${rq.id}`}
                      className="font-medium text-foreground hover:text-info hover:underline"
                    >
                      {rq.title}
                    </Link>
                    <Badge tone={rs.tone}>{rs.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
