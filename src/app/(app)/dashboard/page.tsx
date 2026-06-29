import type { Metadata } from "next";
import { Building2, Handshake, Store, Target } from "lucide-react";

import { ActivityTimeline } from "@/components/activity-timeline";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const GETTING_STARTED = [
  "Add operator companies and their contacts",
  "Capture acquisition requirements (the matching brief)",
  "Import or add leisure listings (disposals)",
  "Review matches and progress deals",
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

  const kpis = [
    { label: "Companies", value: companies.count ?? 0, icon: Building2 },
    { label: "Active listings", value: listings.count ?? 0, icon: Store },
    { label: "Live requirements", value: requirements.count ?? 0, icon: Target },
    { label: "Open deals", value: deals.count ?? 0, icon: Handshake },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" description="Your agency at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center justify-between p-4">
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
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>The workflow, end to end.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2.5">
              {GETTING_STARTED.map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ol>
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
