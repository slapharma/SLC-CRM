import type { Metadata } from "next";

import { AdminPanel, type Member } from "@/components/admin-panel";
import { DataImport } from "@/components/data-import";
import { MarketIntelAdmin, type IntelSourceStatus } from "@/components/market-intel-admin";
import { getContactRoles } from "@/lib/contact-roles";
import { getCompanyTypes } from "@/lib/company-types";
import { INTEL_SOURCES } from "@/lib/intel/sources";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

// The Market Intel resync action scrapes a partner site live (20+ page
// fetches) — give it more than the default function budget.
export const maxDuration = 120;

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

  const contactRoles = await getContactRoles();
  const companyTypes = await getCompanyTypes();

  // Market Intel per-source stats: row count + newest created_at per source.
  const { data: intelRows } = await supabase
    .from("disposals")
    .select("source, created_at")
    .eq("agency_id", agencyId)
    .eq("listing_type", "intel");
  const intelSources: IntelSourceStatus[] = INTEL_SOURCES.map((s) => {
    const rows = (intelRows ?? []).filter((r) => r.source === s.id);
    const lastSynced = rows.length
      ? rows.map((r) => r.created_at).sort().at(-1)!
      : null;
    return {
      id: s.id,
      label: s.label,
      website: s.website,
      hasScraper: s.scraper !== null,
      count: rows.length,
      lastSynced,
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
        contactRoles={contactRoles}
        companyTypes={companyTypes}
      />

      <div className="mt-4">
        <CollapsibleCard
          title="Market Intel"
          description="Partner-agent stock: resync live or delete per source."
        >
          <MarketIntelAdmin sources={intelSources} />
        </CollapsibleCard>
      </div>

      <div className="mt-4">
        <CollapsibleCard
          title="Import data"
          description="Bulk-import Companies, Contacts, Requirements and Listings from CSV."
        >
          <DataImport />
        </CollapsibleCard>
      </div>
    </div>
  );
}
