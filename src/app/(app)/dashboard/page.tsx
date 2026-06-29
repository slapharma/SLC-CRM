import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Handshake,
  Sparkles,
  Store,
  Target,
  UserPlus,
} from "lucide-react";

import { ActivityTimeline } from "@/components/activity-timeline";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const QUICK_ADD = [
  { href: "/companies/new", label: "Add company", icon: Building2 },
  { href: "/contacts/new", label: "Add contact", icon: UserPlus },
  { href: "/listings", label: "Add listing", icon: Store },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const [companies, listings, requirements, deals, activities] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("disposals").select("*", { count: "exact", head: true }),
    supabase
      .from("requirements")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("deals").select("*", { count: "exact", head: true }),
    supabase
      .from("activities")
      .select("id, type, subject, body, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(8),
  ]);

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
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      {kpi.value.toLocaleString("en-GB")}
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Add records, then find matches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {QUICK_ADD.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(buttonVariants({ variant: "secondary" }))}
                  >
                    <Icon />
                    {action.label}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/matches"
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-14 w-full text-base font-semibold uppercase tracking-wide",
              )}
            >
              <Sparkles className="!size-5" />
              Matchmake now
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest calls, viewings and notes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityTimeline activities={activities.data ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
