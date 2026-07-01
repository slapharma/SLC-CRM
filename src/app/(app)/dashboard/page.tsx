import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Handshake,
  PoundSterling,
  Sparkles,
  Store,
  Target,
  UserPlus,
} from "lucide-react";

import { ConcentrationMap } from "@/components/concentration-map";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getMapLayers } from "@/lib/supabase/map-points";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

// All quick actions share one style (uniform secondary buttons in a grid).
const QUICK_ACTIONS = [
  { href: "/companies/new", label: "Add company", icon: Building2 },
  { href: "/contacts/new", label: "Add contact", icon: UserPlus },
  { href: "/listings/new", label: "Add listing", icon: Store },
  { href: "/requirements/new", label: "Add requirement", icon: Target },
  { href: "/matches", label: "Matchmake now", icon: Sparkles },
];

const fmtMoney = (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`;

export default async function DashboardPage() {
  const supabase = await createClient();
  const [companies, listings, requirements, deals, dealValues, mapLayers] =
    await Promise.all([
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase.from("disposals").select("*", { count: "exact", head: true }),
      supabase
        .from("requirements")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("deals").select("*", { count: "exact", head: true }),
      supabase.from("deals").select("value"),
      getMapLayers(supabase),
    ]);

  const pipelineValue = (dealValues.data ?? []).reduce(
    (sum, d) => sum + (d.value ?? 0),
    0,
  );

  const { data: membership } = await supabase
    .from("agency_members")
    .select("agencies(name)")
    .limit(1)
    .maybeSingle();
  const agencyName =
    (membership?.agencies as { name: string } | null)?.name ?? "Your agency";

  const kpis = [
    { label: "Companies", value: companies.count ?? 0, icon: Building2, href: "/companies" },
    { label: "Active listings", value: listings.count ?? 0, icon: Store, href: "/listings" },
    { label: "Live requirements", value: requirements.count ?? 0, icon: Target, href: "/requirements" },
    { label: "Open deals", value: deals.count ?? 0, icon: Handshake, href: "/deals" },
    {
      label: "Pipeline value",
      value: fmtMoney(pipelineValue),
      icon: PoundSterling,
      href: "/deals",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-12 flex items-center gap-4">
        {/* CDG Leisure brand mark — identifies the agency account. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cdg-logo.svg"
          alt="CDG Leisure"
          className="h-10 w-auto shrink-0"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{agencyName}</h1>
          <p className="text-sm text-muted-foreground">
            Your agency at a glance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center justify-between p-5 sm:p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                      {typeof kpi.value === "number"
                        ? kpi.value.toLocaleString("en-GB")
                        : kpi.value}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Add records, then find matches.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "h-auto min-h-14 flex-1 justify-start gap-3 text-base",
                  )}
                >
                  <Icon className="!size-5" />
                  {action.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Listings map</CardTitle>
            <CardDescription>Where your listings are across the UK.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConcentrationMap
              layers={{ listings: mapLayers.listings, companies: [], contacts: [] }}
              defaultActive="listing"
              compact
              hideToggles
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
