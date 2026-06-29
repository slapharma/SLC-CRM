# SLC-CDG-CRM — Leisure Real Estate CRM (Kato-for-Agencies clone)

A commercial-property agency CRM for the UK **leisure & licensed sector** (restaurants,
bars, clubs, coffee shops). Modeled on Kato for Agencies, with a leisure-specific
domain layer.

- **Market / regulatory model:** UK (Use Classes E / Sui Generis, Licensing Act 2003)
- **Stack:** Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, RLS)
- **MVP scope:** CRM + Listings + Requirements + Matching engine
- **Later phases:** Marketing engine, Deal pipeline / Heads of Terms, Client portals, Insights

---

## Domain model (UK leisure)

Core entities (supply ↔ demand spine):

- **Company** — operators (restaurant/bar groups), landlords, agents, vendors. `type`, sector tags.
- **Contact** — people, linked to a Company; role (acquisitions, landlord, solicitor).
- **Listing (Unit)** — a leisure premises being marketed.
  - Address, lat/lng, town, region, floor area (sq ft / sq m), frontage width
  - **Use class** (E, Sui Generis: pub/bar/nightclub/hot-food-takeaway; legacy A3/A4/A5)
  - **Premises licence** (held Y/N, hours, capacity, conditions), late licence
  - **Covers** (internal + external/pavement), kitchen extraction, 3-phase power, gas
  - **Tenure** (freehold / leasehold / assignment / new letting), tied vs free-of-tie
  - Rent, premium, F&F value, goodwill, rateable value, EPC, service charge
  - Existing trade (turnover / barrelage), status (available / U.O. / let / sold)
- **Requirement (Acquisition brief)** — what an operator wants.
  - Target towns/regions, sq ft band, covers band, use class needed, max rent/premium,
    tenure preference, demographics/footfall, proximity to anchors/competitors, notes
- **Deal** — links Listing + Requirement + parties; stage pipeline; Heads of Terms.
- **Activity** — calls, emails, viewings, notes; polymorphic link to any entity.
- **Match** — generated supply↔demand candidate with a score + reasons.

---

## Phase 0 — Project scaffolding
- [x] `create-next-app` (TypeScript, App Router, Tailwind v4, ESLint) — Next.js 16.2.9, React 19
- [x] Wire GitHub (`slapharma/SLC-CRM`) + Vercel (`slc-crm`) — auto-deploy on push to `main` (live at slc-crm.vercel.app)
- [x] Run **ui-ux-pro-max** skill → design system at `design-system/slc-crm/MASTER.md`
- [x] Research Next 16 / Tailwind v4 / shadcn / `@supabase/ssr` conventions → build playbook (workflow)
- [x] Add Supabase client (`@supabase/ssr`) — client/server/proxy, env-guarded, `.env.example` (go-live needs a provisioned project)
- [x] App shell: root layout, sidebar nav, top bar, Tailwind v4 theme tokens, light/dark mode
- [x] Auth (login/signup/logout) + protected `(app)` route group — code complete; org/tenant scoping lands with Phase 1 RLS
- [x] CI: typecheck + lint + build (GitHub Actions)

**Gate:** provision Supabase (new cloud project vs. existing) → set `NEXT_PUBLIC_SUPABASE_*` in Vercel → auth goes live. Then Phase 1 schema.

## Phase 1 — Data layer (Supabase) ✅ applied to project `akxortffkrknoxysgeei`
- [x] Schema migration: agencies + members, companies, contacts, **disposals** (the supply/Listings table), requirements, deals, activities, matches
- [x] Enums for UK use classes, licence, tenure, deal/requirement/match stages, roles, activity & entity types
- [x] Row-Level Security (per-agency isolation via `auth_agency_ids()`) + admin/agent roles. Functions hardened (`0003`) per security advisor
- [x] Generated TypeScript types → `src/lib/database.types.ts`; Supabase clients typed `<Database>`
- [x] Seed data: on signup, `handle_new_user` auto-creates the user's agency + admin membership + sample companies/disposals/requirements (`seed_agency`)
- [x] **Reconciled `disposals` = Listings** (merge of the parallel CDG-import workstream): one tenant-scoped `disposals` table (rich CDG schema + `agency_id`/RLS + Storage), dropped the thin `listings`, repointed deals/matches, CDG importer made agency-aware (`0004`/`0005`). Verified: A sees 2/4 disposals (own agency only)

## Phase 2 — CRM core
- [x] Companies: list (search/filter), detail, create/edit/delete — server actions + RLS-scoped queries; verified live (list/search/insert pass RLS)
- [x] Contacts: list (search), detail, create/edit/delete — linked to companies (clickable + "Add contact"); verified live (insert passes RLS)
- [ ] Activity timeline (logged on every entity)
- [ ] Global search

## Phase 3 — Listings / disposals (supply)
- [x] Listing list (search by title/town) with status/use-class/size/rent columns
- [x] Listing detail: full leisure attribute set, commercials, agent, images, lossless marketing sections, brochure + source link
- [x] CDG import box on the listings page (agency-scoped) via the import action/route
- [ ] Manual create/edit form (import is the primary path — deferred) + map view (lat/lng)

## Phase 4 — Requirements (demand) ✅ (brought forward — drives matching)
- [x] Requirement list (search) + detail + create/edit/delete
- [x] Linked to operator Company; surfaced on the company record ("Add requirement")
- [x] **All matchable options vs disposals** (migration `0006`): target towns/regions, property_types,
      use_classes, size & covers bands, tenure, max rent/premium/guide-price, fit-out — every field
      maps to a disposal column for the Phase 5 matching engine

## Phase 5 — Matching engine (differentiator)
- [x] Scoring function `scoreMatch` (location, size/covers bands, use class, property type, tenure, rent/premium/guide, fit-out — weighted 0–100 with per-dimension reasons)
- [x] "Matching listings" on a requirement + "Matching requirements" on a listing + agency-wide `/matches` (50%+ pairs)
- [x] Match reasons surfaced (✓/✗ chips per dimension)
- [ ] One-click create Deal from a match (deferred); (stretch) LLM-assisted explanations

## Verification (each phase)
- [ ] Manual run-through against seed data
- [ ] RLS tested (no cross-tenant leakage)
- [ ] Typecheck + lint clean

---

## Active task — CDG Leisure → `disposals` extractor (feeds Phase 3 Listings)

Turn a CDG Leisure property URL into a structured, insert-ready `disposals` row.

**Key finding:** CDG runs on the **Agents' Society** platform. Every field is embedded
in the page HTML as one JSON object passed to `AI.mapBox.init('<token>', [ {…} ], 'map')`.
We parse that object directly — no fragile DOM/table scraping — and it exposes fields
not shown in the UI (`rateable_value`, `business_rates`, `service_charge`,
`estate_charge`, `parking_charge`, `lat`/`lng`, full agent record, per-floor unit
table, all marketing sections). This maps 1:1 onto the Listing (Unit) model above.

- [x] `src/lib/disposals/cdg.ts` — self-contained (types + parser + mapper); no Next /
      Supabase imports so it runs and tests anywhere.
  - [x] `extractCdgProperty(html)` — string-aware scan to carve the JSON array out of
        `AI.mapBox.init(...)`, `JSON.parse`, return first record.
  - [x] `mapCdgToDisposal(raw, sourceUrl)` — map + derive: money (amount + period +
        qualifier), lease (term/expiry/review/1954-Act), covers (internal/external),
        use class, EPC, agent, images, brochure, key features, lossless `sections[]`.
  - [x] `fetchAndExtractCdg(url)` — fetch + extract + map.
- [x] Verify against live 311 West End Lane (ref 378436): rent 50000, premium 95000,
      650 sqft / 60.39 sqm, 24+16 covers, lease→Jun 2041, Class E, agent David Kornbluth.

**Result:** `scripts/verify-cdg.ts` — 34/34 checks pass against both the saved fixture
and the live URL. `npx tsc --noEmit` and `eslint` clean. `scripts/` excluded from
`tsconfig` so the harness's `.ts`-extension import can't break `next build`.

### Persistence + image re-hosting (in progress)
Constraints: **no service-role key** (only anon + URL) → server-side writes run as the
authenticated user, so the table and Storage bucket both need `authenticated` RLS
policies. Next 16 confirmed: `params` is a Promise; `cookies()`/`headers()` async;
route handlers/`fetch` uncached by default; server functions must self-verify auth.

Build (verified locally — no live cloud writes):
- [x] `src/lib/disposals/image.ts` — `cleanImageUrl()` (drop imgix `mark*` watermark
      params), `filenameFromUrl()`, `contentTypeFromName()`. Pure + unit-checked (5/5).
- [x] `src/lib/disposals/storage.ts` — `rehostMedia(row, supabase)`: download clean
      image → upload to `disposals` bucket → rewrite `images[].url` to the public URL,
      keep `source_url` for provenance. Media failures non-fatal.
- [x] `src/lib/disposals/import.ts` — `importDisposalFromUrl(url, supabase, {rehost})`:
      fetch+extract+map → optional re-host → upsert on `(source, source_ref)`.
- [x] `src/lib/disposals/actions.ts` — `"use server"` `importDisposal(prev, formData)`
      (matches auth.ts: config guard → auth guard → import → revalidate `/listings`).
- [x] `src/app/api/disposals/import/route.ts` — `POST {url}`, auth-guarded, `Response.json`.
- [x] `supabase/migrations/20260624094649_disposals.sql` — table (cols = `DisposalInsert`,
      jsonb for sections/images/floors, `unique(source, source_ref)`), `updated_at`
      trigger, RLS (authenticated-all for now; tenant-scope is Phase 1), public
      `disposals` Storage bucket + authenticated write policy.
- [x] Verify: image helpers 5/5, extractor 34/34, `tsc` clean, `eslint` clean,
      `next build` OK — `/api/disposals/import` registers as a dynamic route (ƒ).

**Not yet applied to the live project (needs sign-off):** running the migration (creates
table + bucket + RLS), and a real end-to-end import insert. SQL not yet executed against
a DB. Import UI on the Listings page also still to do.

Note: re-hosting strips CDG's watermark from their marketing photos — fine if CDG is
your own brand; a content-ownership question if it's a third party. Flagged, your call.

**Out of scope until confirmed:** creating the `disposals` table in Supabase (no DB
writes without sign-off); server action / API route to persist (will read
`node_modules/next/dist/docs/` first per AGENTS.md); bulk crawling of CDG (ToS — your call).

## Review
_(to be filled in as phases complete)_
