import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import {
  Bell,
  FileText,
  Handshake,
  MessageSquare,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });

/* Landing-page palette, matched to the hero mockup's forest green. */
const GREEN_TEXT = "text-[#1E4B38]";
const GREEN_BG = "bg-[#1E4B38]";
const GREEN_BG_HOVER = "hover:bg-[#16382A]";
const GREEN_TINT = "bg-[#1E4B38]/10";

/** A landing-page screenshot inside the same faux browser frame the Quick Guide uses. */
function ShotFrame({
  path,
  src,
  alt,
}: {
  path: string;
  src: string;
  alt: string;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
        <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
          {path}
        </span>
      </div>
      {/* Screenshots captured at 1440×900 (16:10); the fixed ratio reserves
          space so the page doesn't jump while they load. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="block aspect-[16/10] w-full bg-muted/40 object-cover"
      />
    </figure>
  );
}

const PAINS = [
  {
    title: "The requirement in someone's inbox",
    body: "An operator told a colleague exactly what they want three weeks ago. It's in an email thread nobody else can see — and a rival agent just found them the site.",
  },
  {
    title: "A CRM built for someone else's sector",
    body: "Most agents run leisure deals through systems built for offices and retail — even the sector's own tools can't search on a premises licence, covers or extraction. The criteria that decide a leisure deal simply aren't fields you can filter on.",
  },
  {
    title: "Matching that's really just browsing",
    body: "When your system can't express what an operator actually wants, 'matching' means scrolling a long list of near-misses and relying on memory. The genuine fit is in there — buried under forty properties that were never right.",
  },
];

const SHOWCASE = [
  {
    path: "/matches",
    src: "/guide/matches.png",
    alt: "MatchMaker screen scoring every requirement against every listing, with match percentages and one-click deal creation",
    kicker: "MatchMaker",
    title: "Only the pairings that genuinely fit",
    body: "MatchMaker scores every live requirement against every live listing on the criteria other systems can't even search — location, size, use class, tenure, rent vs budget. Weak pairings never reach your screen; what's left is a ranked shortlist of deals worth your morning, each with the reasons spelled out.",
    points: [
      "No browsing, no near-misses — sub-50% pairings are filtered out",
      "Scored on leisure criteria, not generic property fields",
      "Every match explains itself, and one click makes it a deal",
    ],
  },
  {
    path: "/listings",
    src: "/guide/listings-detail.png",
    alt: "Listing detail page showing premises attributes, commercials, a location map and a Download PDF button",
    kicker: "Listings",
    title: "Particulars that speak fluent licensed premises",
    body: "Use class, premises licence, covers, extraction, tenure, rent, premium, guide price — the detail operators actually ask for, structured on every record. Then send it out as branded PDF particulars in one click.",
    points: [
      "Purpose-built fields for restaurants, bars and licensed units",
      "One-click branded PDF particulars, ready to send",
      "Share, print or post to your website from the same screen",
    ],
  },
  {
    path: "/deals",
    src: "/guide/deals.png",
    alt: "Pipeline page showing deals grouped by stage with total pipeline value",
    kicker: "Pipeline",
    title: "Every deal and every fee, at a glance",
    body: "Deals move through your pipeline stage by stage, with the total value always on screen. Filter by agent to see who's closing what — and never let a viewing go quiet again.",
    points: [
      "Pipeline value, open deals and wins on one screen",
      "Move a deal through stages in two clicks",
      "Reminders and notifications keep every deal warm",
    ],
  },
  {
    path: "/map",
    src: "/guide/map.png",
    alt: "UK map with listings, companies and contacts pinned across England",
    kicker: "Map",
    title: "Your whole patch on one map",
    body: "Every listing, company and contact, geocoded and pinned across the UK. Click a pin for the full record. When an operator says 'anything in the North West?', the answer is one glance away.",
    points: [
      "Listings, companies and contacts as separate layers",
      "Click any pin to open the record card",
      "Spot gaps and clusters in your coverage instantly",
    ],
  },
];

const EXTRAS = [
  {
    icon: ShieldCheck,
    title: "Built-in KYC",
    body: "Companies House, sanctions and VAT checks on any company — before you commit to acting.",
  },
  {
    icon: Sparkles,
    title: "AI Deep Dive",
    body: "One click builds a research report on any company, so you walk into every call informed.",
  },
  {
    icon: MessageSquare,
    title: "Team messaging",
    body: "Send a listing or a note straight to a colleague. No more 'did you see my email?'",
  },
  {
    icon: Search,
    title: "Search everything",
    body: "Companies, listings and requirements from one search bar, from any page.",
  },
  {
    icon: FileText,
    title: "Branded PDFs",
    body: "Client-ready particulars, branded or unbranded, generated in seconds.",
  },
  {
    icon: Bell,
    title: "Reminders that chase",
    body: "Deal reminders and notifications so nothing goes cold while you're out viewing.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Add what you know",
    body: "Companies, contacts, listings and operator requirements — with fields built for leisure property, it takes minutes, not days.",
  },
  {
    step: "2",
    title: "Let MatchMaker work",
    body: "Every requirement is scored against every listing automatically. Your best opportunities surface themselves, ranked and explained.",
  },
  {
    step: "3",
    title: "Close and get paid",
    body: "Turn a match into a deal in one click, walk it through your pipeline, and watch the fee land — with the whole team in the loop.",
  },
];

/* Placeholder testimonials — swap for real client quotes before launch. */
const QUOTES = [
  {
    quote:
      "The first morning we switched it on, MatchMaker surfaced a pairing we'd all missed. That one deal paid for years of the software.",
    name: "Director",
    firm: "Leisure agency, London",
  },
  {
    quote:
      "Finally a CRM with a field for a premises licence. Our particulars go out same-day now instead of 'by the end of the week'.",
    name: "Associate agent",
    firm: "Licensed property specialists, Manchester",
  },
  {
    quote:
      "The map sold it for me. An operator asked what we had in the North West and I answered before the call ended.",
    name: "Head of agency",
    firm: "Restaurant & bar agency, Leeds",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero — the mockup's restaurant scene as canvas, real text overlaid.
            The image sits in the right ~82% at a reduced scale, fading into a
            white left edge so the headline never overlaps the laptop. */}
        <section className="relative isolate overflow-hidden bg-white">
          <picture className="absolute inset-y-0 left-[18%] right-0 -z-10 sm:left-[22%]">
            <source media="(max-width: 640px)" srcSet="/landing/hero-mobile.webp" />
            <img
              src="/landing/hero.webp"
              alt=""
              className="h-full w-full object-cover object-[80%_center] [mask-image:linear-gradient(to_right,transparent,black_45%)]"
            />
          </picture>
          {/* In-hero top bar: logo left, auth buttons right (no separate header) */}
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/logo.png"
              alt="CliftonAi-CRM"
              className="h-12 w-auto sm:h-16"
            />
            <nav className="flex items-center gap-2">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  GREEN_TEXT,
                )}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  GREEN_BG,
                  GREEN_BG_HOVER,
                  "text-white",
                )}
              >
                Start free
              </Link>
            </nav>
          </div>
          <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-16 sm:pb-32 sm:pt-20 lg:pb-36 lg:pt-24">
            <div className="max-w-xl">
              <p
                className={cn(
                  "mb-5 inline-flex items-center gap-2 rounded-full border border-[#1E4B38]/20 bg-white/80 px-3 py-1 text-xs font-medium",
                  GREEN_TEXT,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", GREEN_BG)} />
                UK leisure &amp; licensed property
              </p>
              <h1
                className={cn(
                  headingFont.className,
                  GREEN_TEXT,
                  "max-w-lg text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl",
                )}
              >
                The AI-Powered CRM Built for Property Professionals
              </h1>
              <div className={cn("mt-6 h-0.5 w-12", GREEN_BG)} />
              <p className={cn("mt-5 text-lg font-medium", GREEN_TEXT)}>
                Smarter Systems. Stronger Relationships. Better Outcomes.
              </p>
              <p className="mt-3 max-w-md text-pretty leading-relaxed text-foreground/70">
                Designed to properly track; Operators, Landlords and Listings,
                allowing MatchMaker to surface potential deals.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    GREEN_BG,
                    GREEN_BG_HOVER,
                    "text-white",
                  )}
                >
                  Start free — takes a minute
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "border border-[#1E4B38]/30 bg-white/70 hover:bg-white",
                    GREEN_TEXT,
                  )}
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-3 text-xs text-foreground/60">
                No card required. Your agency workspace is ready the moment you
                sign up.
              </p>
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 text-center sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold tracking-tight">Scored matching</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Every requirement × every listing, ranked with reasons
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">Licensing-grade detail</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use class, premises licence, covers &amp; extraction on every record
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">One workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">
                CRM, listings, matching, KYC, map and pipeline together
              </p>
            </div>
          </div>
        </section>

        {/* Pain */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className={cn(
                headingFont.className,
                "text-balance text-3xl font-semibold tracking-tight",
              )}
            >
              Sound familiar?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Most leisure agencies run on spreadsheets, inboxes and memory.
              It works — right up until it costs you a deal.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.title} className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature showcases */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl space-y-24 px-6 py-20">
            {SHOWCASE.map((f, i) => (
              <div
                key={f.kicker}
                className="grid items-center gap-10 lg:grid-cols-2"
              >
                <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                  <p
                    className={cn(
                      "text-sm font-semibold uppercase tracking-wide",
                      GREEN_TEXT,
                    )}
                  >
                    {f.kicker}
                  </p>
                  <h2
                    className={cn(
                      headingFont.className,
                      "mt-2 text-balance text-3xl font-semibold tracking-tight",
                    )}
                  >
                    {f.title}
                  </h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5 text-sm">
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            GREEN_BG,
                          )}
                        />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : undefined}>
                  <ShotFrame path={f.path} src={f.src} alt={f.alt} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Everything else */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className={cn(
                headingFont.className,
                "text-balance text-3xl font-semibold tracking-tight",
              )}
            >
              And everything around the deal, too
            </h2>
            <p className="mt-3 text-muted-foreground">
              The admin that eats your week — compliance, research, chasing,
              paperwork — handled in the same place you work.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-lg border bg-card p-5">
                  <div
                    className={cn(
                      "mb-3 flex h-9 w-9 items-center justify-center rounded-md",
                      GREEN_TINT,
                      GREEN_TEXT,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className={cn(
                  headingFont.className,
                  "text-balance text-3xl font-semibold tracking-tight",
                )}
              >
                Up and running before your coffee goes cold
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three steps between you and your first scored match.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="rounded-lg border bg-card p-6">
                  <div
                    className={cn(
                      "mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white",
                      GREEN_BG,
                    )}
                  >
                    {s.step}
                  </div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className={cn(
                headingFont.className,
                "text-balance text-3xl font-semibold tracking-tight",
              )}
            >
              Agents who stopped matching from memory
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {QUOTES.map((q) => (
              <figure key={q.quote} className="flex flex-col rounded-lg border bg-card p-6">
                <Quote className={cn("h-5 w-5", GREEN_TEXT)} aria-hidden />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed">
                  &ldquo;{q.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{q.name}</span>
                  {" · "}
                  {q.firm}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={cn("border-t text-white", GREEN_BG)}>
          <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
            <div className="mx-auto flex max-w-2xl flex-col items-center">
              <Handshake className="h-8 w-8 opacity-80" aria-hidden />
              <h2
                className={cn(
                  headingFont.className,
                  "mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl",
                )}
              >
                The next great pairing in your patch is sitting in a spreadsheet.
              </h2>
              <p className="mt-4 max-w-xl text-pretty leading-relaxed opacity-90">
                Put your listings and requirements in one place and let MatchMaker
                show you what you&apos;ve been missing.
              </p>
              <div className="mt-8">
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "bg-white text-[#1E4B38] hover:bg-white/90",
                  )}
                >
                  Create your free account
                </Link>
              </div>
              <p className="mt-3 text-xs opacity-75">
                Sign up in under a minute. No card required.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/logo.png" alt="CliftonAi-CRM" className="h-7 w-auto" />
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Built for leisure &amp; licensed-sector agents
          </span>
        </div>
      </footer>
    </div>
  );
}
