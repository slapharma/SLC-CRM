import type { Metadata } from "next";

import { AdminPanel, type Member } from "@/components/admin-panel";
import { ContactRolesPanel, type ContactRow } from "@/components/contact-roles-panel";
import { DataImport } from "@/components/data-import";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const agencyId = await currentAgencyId(supabase);

  let isAdmin = false;
  if (agencyId) {
    const { data } = await supabase.rpc("is_agency_admin", {
      p_agency_id: agencyId,
    });
    isAdmin = data === true;
  }

  if (!user || !agencyId || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Admin" description="Team & access management." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You need to be an agency admin to manage the team.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: memberRows } = await supabase
    .from("agency_members")
    .select("user_id, role")
    .eq("agency_id", agencyId);
  const ids = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, linkedin_url, x_url")
    .in("id", ids);
  const profileOf = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: settings } = await supabase
    .from("agency_settings")
    .select("openrouter_api_key, openrouter_model")
    .eq("agency_id", agencyId)
    .maybeSingle();
  const hasOpenRouterKey = Boolean(settings?.openrouter_api_key);
  const openRouterModel = settings?.openrouter_model ?? "perplexity/sonar";

  // #2: contacts for the admin role editor (with their company name).
  const { data: contactRows } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, role, companies(name)")
    .eq("agency_id", agencyId)
    .order("first_name");
  const contacts: ContactRow[] = (contactRows ?? []).map((c) => {
    const co = c.companies as { name: string } | { name: string }[] | null;
    const company = co == null ? null : Array.isArray(co) ? (co[0]?.name ?? null) : co.name;
    return {
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed contact",
      email: c.email,
      company,
      role: c.role,
    };
  });

  const members: Member[] = (memberRows ?? [])
    .map((m) => {
      const p = profileOf.get(m.user_id);
      return {
        id: m.user_id,
        role: m.role,
        email: p?.email ?? null,
        fullName: p?.full_name ?? null,
        phone: p?.phone ?? null,
        avatarUrl: p?.avatar_url ?? null,
        linkedinUrl: p?.linkedin_url ?? null,
        xUrl: p?.x_url ?? null,
      };
    })
    .sort((a, b) => {
      const an = a.fullName ?? a.email ?? "";
      const bn = b.fullName ?? b.email ?? "";
      return a.role === b.role
        ? an.localeCompare(bn)
        : a.role === "admin"
          ? -1
          : 1;
    });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Admin"
        description="Add agents, manage roles and reset passwords."
      />
      <AdminPanel
        members={members}
        currentUserId={user.id}
        hasOpenRouterKey={hasOpenRouterKey}
        openRouterModel={openRouterModel}
      />

      <ContactRolesPanel contacts={contacts} />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Import data</CardTitle>
          <CardDescription>
            Bulk-import Companies, Contacts, Enquiries and Listings from CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataImport />
        </CardContent>
      </Card>
    </div>
  );
}
