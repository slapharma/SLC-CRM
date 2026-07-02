"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Building2,
  Check,
  CircleCheck,
  Compass,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Map as MapIcon,
  MessageSquare,
  RotateCcw,
  Rocket,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One tonal accent per step — kept to the brand's own semantic tokens so the
 *  journey reads as guided colour-coding, not a rainbow. */
type Accent = "primary" | "info" | "success" | "warning" | "violet";

const ACCENT: Record<Accent, { chip: string; ring: string; bar: string }> = {
  primary: {
    chip: "bg-primary/10 text-primary",
    ring: "ring-primary/30",
    bar: "bg-primary",
  },
  info: {
    chip: "bg-info/10 text-info",
    ring: "ring-info/30",
    bar: "bg-info",
  },
  success: {
    chip: "bg-success/10 text-success",
    ring: "ring-success/30",
    bar: "bg-success",
  },
  warning: {
    chip: "bg-warning/10 text-warning",
    ring: "ring-warning/30",
    bar: "bg-warning",
  },
  violet: {
    chip: "bg-chart-4/10 text-chart-4",
    ring: "ring-chart-4/30",
    bar: "bg-chart-4",
  },
};

type Step = {
  key: string;
  /** Short label for the rail / dots. */
  label: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  accent: Accent;
  /** Plain-language "what is this for". */
  what: string;
  /** 2–4 concrete "how to use it" actions. */
  how: string[];
  href: string;
  cta: string;
  /** Optional pro tip shown in a muted callout. */
  tip?: string;
  adminOnly?: boolean;
};

const STEPS: Step[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Start at your Dashboard",
    tagline: "Your agency at a glance",
    icon: LayoutDashboard,
    accent: "primary",
    what: "The Dashboard is your home base. It shows live counts for companies, listings, requirements and open deals, your total pipeline value, and a map of where your listings sit across the UK.",
    how: [
      "Click any KPI card to jump straight into that record list.",
      "Use the Quick actions panel to add your first company, contact, listing or requirement.",
      "Glance at the map to see where your stock is concentrated.",
    ],
    href: "/dashboard",
    cta: "Open Dashboard",
    tip: "Come back here any time you want the big picture in one screen.",
  },
  {
    key: "companies",
    label: "Companies",
    title: "Build your Companies database",
    tagline: "Every operator, landlord and investor",
    icon: Building2,
    accent: "primary",
    what: "Companies are the organisations you work with — pub operators, restaurant groups, landlords, funds and agents. Each company holds its type, location and a full activity history.",
    how: [
      "Hit “Add company” and record the name, type and address.",
      "Open a company to see its contacts, listings, requirements and deals in one place.",
      "Edit the company type inline — types are configurable in Admin.",
    ],
    href: "/companies",
    cta: "Open Companies",
  },
  {
    key: "contacts",
    label: "Contacts",
    title: "Add the Contacts behind them",
    tagline: "The people you actually deal with",
    icon: Users,
    accent: "info",
    what: "Contacts are the individuals at each company — decision-makers, agents and referrers. Linking a contact to a company keeps every relationship connected.",
    how: [
      "Create a contact and assign their role (e.g. Operator, Investor, Landlord).",
      "Link them to their company so they appear on that company's page.",
      "Roles are fully editable in Admin to match how your team works.",
    ],
    href: "/contacts",
    cta: "Open Contacts",
    tip: "A contact with a company link is worth ten loose business cards.",
  },
  {
    key: "listings",
    label: "Listings",
    title: "List the space you're marketing",
    tagline: "Available units, pubs and venues",
    icon: Store,
    accent: "primary",
    what: "Listings are the properties you're disposing of or marketing. Each carries location, size, tenure and a CDG or INTEL type so you can separate public stock from off-market intel.",
    how: [
      "Add a listing with its address, key figures and a linked company & contact.",
      "Set the listing type — CDG for marketed stock, INTEL for confidential leads.",
      "Export a branded (CDG) or unbranded (INTEL) PDF to share with clients.",
    ],
    href: "/listings",
    cta: "Open Listings",
  },
  {
    key: "kyc",
    label: "KYC",
    title: "Run KYC & compliance checks",
    tagline: "Know your counterparty",
    icon: ScrollText,
    accent: "warning",
    what: "KYC pulls Companies House data, sanctions (OFSI) and VAT lookups so you can vet a counterparty before you commit — the compliance backbone for every deal.",
    how: [
      "Search a company to generate a KYC report.",
      "Review the Companies House, sanctions and VAT results in one view.",
      "Save the report against the record for your audit trail.",
    ],
    href: "/kyc",
    cta: "Open KYC",
    tip: "Do this early — it's far cheaper to check before the paperwork starts.",
  },
  {
    key: "map",
    label: "Map",
    title: "See everything on the Map",
    tagline: "Geography tells a story",
    icon: MapIcon,
    accent: "info",
    what: "The Map plots your listings, companies and contacts as a heatmap of the UK, so you can spot concentration, gaps and opportunities at a glance.",
    how: [
      "Toggle the listings, companies and contacts layers on and off.",
      "Click a pin to open its record in a quick modal.",
      "Use it to brief a client on where your coverage is strongest.",
    ],
    href: "/map",
    cta: "Open Map",
  },
  {
    key: "requirements",
    label: "Requirements",
    title: "Capture buyer Requirements",
    tagline: "What your acquirers are hunting for",
    icon: Target,
    accent: "violet",
    what: "Requirements record what an acquirer wants — location, size, budget and use class. They're the demand side that powers automatic matching against your listings.",
    how: [
      "Add a requirement and link it to the company & contact behind it.",
      "Set the target area, size band and budget.",
      "Keep it active while the search is live so it stays in the matcher.",
    ],
    href: "/requirements",
    cta: "Open Requirements",
  },
  {
    key: "matches",
    label: "MatchMaker",
    title: "Let MatchMaker connect the dots",
    tagline: "Supply, meet demand",
    icon: Sparkles,
    accent: "primary",
    what: "MatchMaker automatically pairs your live requirements against your listings, surfacing the best fits so you never miss an obvious introduction.",
    how: [
      "Open MatchMaker to see suggested requirement ↔ listing pairs.",
      "Review the match strength and the reasons behind it.",
      "Act on a strong match by starting a deal or messaging the contact.",
    ],
    href: "/matches",
    cta: "Open MatchMaker",
    tip: "This is the feature that turns a tidy database into closed business.",
  },
  {
    key: "deals",
    label: "PipeLine",
    title: "Work deals in the PipeLine",
    tagline: "From introduction to completion",
    icon: Handshake,
    accent: "success",
    what: "PipeLine tracks every live deal through its stages, with values, reminders and a running history — so nothing stalls and forecasting is one glance away.",
    how: [
      "Create a deal from a match or straight from a company.",
      "Move it through the stages as it progresses and set reminders.",
      "Watch the pipeline value roll up onto your Dashboard.",
    ],
    href: "/deals",
    cta: "Open PipeLine",
  },
  {
    key: "messages",
    label: "Messages",
    title: "Talk to your team in Messages",
    tagline: "Keep the conversation in one place",
    icon: MessageSquare,
    accent: "info",
    what: "My Messages is your internal inbox. Send notes to colleagues, loop the team in on a record and keep deal chatter out of scattered emails.",
    how: [
      "Open My Messages to read what's been sent to you.",
      "Use “Send to team” to share an update or ask a question.",
      "Reference the company, listing or deal you're talking about.",
    ],
    href: "/messages",
    cta: "Open Messages",
  },
  {
    key: "search",
    label: "Search",
    title: "Find anything with Search",
    tagline: "The fastest way around",
    icon: Search,
    accent: "primary",
    what: "The search bar at the top of every page looks across companies, listings and requirements at once — the quickest route to any record.",
    how: [
      "Click the search box in the top bar (or just start typing).",
      "Search by company name, address or keyword.",
      "Jump straight to the record from the results.",
    ],
    href: "/search",
    cta: "Try Search",
  },
  {
    key: "notifications",
    label: "Alerts",
    title: "Stay current with Notifications",
    tagline: "Never miss what changed",
    icon: Bell,
    accent: "warning",
    what: "The bell in the top bar collects your alerts — new matches, deal reminders and messages — so the important things come to you.",
    how: [
      "Click the bell to see your latest notifications.",
      "Click a notification to open the record it points to.",
      "Use “Mark all read” to clear the badge.",
    ],
    href: "/dashboard",
    cta: "Back to Dashboard",
  },
  {
    key: "admin",
    label: "Admin",
    title: "Configure your workspace in Admin",
    tagline: "Make the CRM yours",
    icon: ShieldCheck,
    accent: "primary",
    what: "Admin is where you tune the CRM to your agency — team roles, editable company types and contact roles, integrations and AI Deep Dive keys all live here.",
    how: [
      "Manage your team and their roles.",
      "Edit the company types and contact roles your records use.",
      "Add integration keys (e.g. Deep Dive) to unlock enrichment.",
    ],
    href: "/admin",
    cta: "Open Admin",
    tip: "Admin tools are available to agency administrators.",
    adminOnly: true,
  },
];

export function GuideJourney({ isAdmin = false }: { isAdmin?: boolean }) {
  const steps = React.useMemo(
    () => STEPS.filter((s) => !s.adminOnly || isAdmin),
    [isAdmin],
  );

  const [index, setIndex] = React.useState(0);
  const [done, setDone] = React.useState(false);
  // Highest step reached — drives the "completed" ticks on the rail.
  const [seen, setSeen] = React.useState(0);

  const total = steps.length;
  const atLast = index === total - 1;

  const go = React.useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next));
      setIndex(clamped);
      setSeen((s) => Math.max(s, clamped));
    },
    [total],
  );

  const next = React.useCallback(() => {
    if (atLast) {
      setSeen(total - 1);
      setDone(true);
      return;
    }
    go(index + 1);
  }, [atLast, go, index, total]);

  const prev = React.useCallback(() => go(index - 1), [go, index]);

  // Arrow-key navigation once the journey has focus/hover.
  React.useEffect(() => {
    if (done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, next, prev]);

  if (done) {
    return <GuideComplete onRestart={() => { setDone(false); go(0); }} />;
  }

  const step = steps[index];
  const Icon = step.icon;
  const accent = ACCENT[step.accent];
  const progress = Math.round(((index + 1) / total) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Compass className="h-3.5 w-3.5 text-primary" />
          Quick Guide
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome — let&apos;s get you up to speed
        </h1>
        <p className="mt-1.5 max-w-2xl text-muted-foreground">
          A two-minute tour of everything the CRM does, in the order you&apos;ll
          use it. Step through at your own pace.
        </p>
      </div>

      {/* Progress bar + count */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Step {index + 1} of {total}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Guide progress"
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500 ease-out", accent.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Rail (desktop) */}
        <nav aria-label="Guide steps" className="hidden lg:block">
          <ol className="space-y-1">
            {steps.map((s, i) => {
              const RailIcon = s.icon;
              const isCurrent = i === index;
              const isDoneStep = i < seen || (i <= seen && i < index);
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors cursor-pointer",
                      isCurrent
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                        isCurrent
                          ? cn(ACCENT[s.accent].chip, "border-transparent")
                          : isDoneStep
                            ? "border-transparent bg-primary/10 text-primary"
                            : "text-muted-foreground",
                      )}
                    >
                      {isDoneStep && !isCurrent ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <RailIcon className="h-3.5 w-3.5" />
                      )}
                    </span>
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step panel — remounts on index change to replay the reveal. */}
        <div key={step.key} className="guide-reveal min-w-0">
          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-4 ring-inset",
                  accent.chip,
                  accent.ring,
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {step.tagline}
                </p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
                  {step.title}
                </h2>
              </div>
            </div>

            <p className="mt-5 leading-relaxed text-foreground/90">{step.what}</p>

            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                How to use it
              </p>
              <ul className="space-y-2.5">
                {step.how.map((line, i) => (
                  <li
                    key={i}
                    className="guide-reveal flex items-start gap-3"
                    style={{ ["--guide-delay" as string]: `${120 + i * 90}ms` }}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                        accent.chip,
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/90">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {step.tip ? (
              <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-dashed bg-muted/40 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">{step.tip}</p>
              </div>
            ) : null}

            <div className="mt-7">
              <Link
                href={step.href}
                className={cn(buttonVariants({ variant: "default" }), "gap-2")}
              >
                {step.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "gap-2 disabled:opacity-40",
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {/* Dot indicators (mobile-friendly) */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => go(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    i === index
                      ? cn("w-5", accent.bar)
                      : i <= seen
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className={cn(buttonVariants({ variant: "default" }), "gap-2")}
            >
              {atLast ? "Finish" : "Next"}
              {atLast ? (
                <CircleCheck className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideComplete({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="guide-reveal rounded-xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CircleCheck className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight">
          You&apos;re all set
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          That&apos;s the whole CRM. The fastest way to learn it is to add your
          first record — everything else connects from there.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/companies/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Rocket className="h-4 w-4" />
            Add your first company
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-6 gap-2 text-muted-foreground",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Replay the guide
        </button>
      </div>
    </div>
  );
}
