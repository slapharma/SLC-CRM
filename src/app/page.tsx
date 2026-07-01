import Link from "next/link";
import {
  Building2,
  Handshake,
  Sparkles,
  Store,
  Target,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Building2,
    title: "Companies & Contacts",
    body: "Operators, landlords, agents and vendors — with the people and roles behind every deal.",
  },
  {
    icon: Store,
    title: "Leisure listings",
    body: "Premises with the attributes that matter: use class, premises licence, covers, extraction, tenure.",
  },
  {
    icon: Target,
    title: "Operator requirements",
    body: "Capture exactly what each operator wants — towns, size, covers, budget and tenure.",
  },
  {
    icon: Sparkles,
    title: "Supply ↔ demand matching",
    body: "Score listings against requirements on location, size, use class and budget — with reasons.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">CliftonAi-CRM</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Sign in
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            UK leisure &amp; licensed property
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The CRM for restaurant, bar &amp; licensed-premises agency.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Track operators and landlords, market leisure units with the licensing
            and covers detail buyers actually ask for, and match supply to demand
            in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
              Open the app
            </Link>
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              Create an account
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-lg border bg-card p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-semibold">{f.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            CliftonAi-CRM
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Built for leisure &amp; licensed-sector agents
          </span>
        </div>
      </footer>
    </div>
  );
}
