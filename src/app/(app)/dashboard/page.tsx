import type { Metadata } from "next";
import { Activity, Building2, Handshake, Store, Target } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

const KPIS = [
  { label: "Companies", value: "—", icon: Building2 },
  { label: "Active listings", value: "—", icon: Store },
  { label: "Live requirements", value: "—", icon: Target },
  { label: "Open deals", value: "—", icon: Handshake },
];

const GETTING_STARTED = [
  "Provision Supabase and run the Phase 1 schema migration",
  "Add your first operator companies and contacts",
  "List available leisure premises",
  "Capture acquisition requirements and generate matches",
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description="Your agency at a glance. Metrics populate once records exist."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                    {kpi.value}
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
            <CardDescription>Phase 0 is live — here&apos;s what comes next.</CardDescription>
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
            <CardDescription>Calls, viewings and notes will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Activity is logged automatically as you work records across the CRM."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
