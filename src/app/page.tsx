import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { Handshake, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const headingFont = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });

/* Landing-page palette, matched to the hero mockup's forest green. */
const GREEN_TEXT = "text-[#1E4B38]";
const GREEN_BG = "bg-[#1E4B38]";
const GREEN_BG_HOVER = "hover:bg-[#16382A]";

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
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero — white background throughout; the mockup photo only appears
            as a right-hand backdrop from sm: up. On mobile it drops down as a
            plain stacked image below the text instead of an absolute overlay,
            so there's no cropping/overlap fight on narrow screens. */}
        <section className="relative isolate overflow-hidden bg-white">
          <picture className="absolute inset-y-0 left-[22%] right-0 -z-10 hidden sm:block">
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
              className="h-9 w-auto sm:h-14 lg:h-16"
            />
            <nav className="flex items-center gap-1 sm:gap-2">
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
          <div className="mx-auto w-full max-w-6xl px-6 pb-10 pt-10 sm:pb-32 sm:pt-20 lg:pb-36 lg:pt-24">
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
            {/* Mobile-only: the hero photo stacks below the text as a plain card */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/hero-mobile.webp"
              alt="CliftonAi-CRM dashboard on a laptop in a restaurant setting"
              className="mt-10 aspect-[16/9] w-full rounded-xl border object-cover object-[65%_40%] shadow-lg sm:hidden"
            />
          </div>
        </section>

        {/* Proof strip */}
        <section className="border-y">
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
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl space-y-16 px-6 py-20 sm:space-y-24">
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
