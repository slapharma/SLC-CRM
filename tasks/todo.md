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

## Phase 1 — Data layer (Supabase)
- [ ] Schema migration: companies, contacts, listings, requirements, deals, activities, matches
- [ ] Enums/lookup tables for UK use classes, licence types, tenure, deal stages (data-driven)
- [ ] Row-Level Security (per-agency tenant isolation) + roles (admin/agent)
- [ ] Generated TypeScript types from schema
- [ ] Seed data: sample operators, units, requirements

## Phase 2 — CRM core
- [ ] Companies + Contacts: list, detail, create/edit, search/filter
- [ ] Activity timeline (logged on every entity)
- [ ] Global search

## Phase 3 — Listings (supply)
- [ ] Listing list view (filters: town, use class, sq ft, tenure, status, rent/premium)
- [ ] Listing detail with leisure attribute set + photos/docs (Supabase Storage)
- [ ] Create/edit form with UK use-class + licence + covers fields
- [ ] Map view (lat/lng)

## Phase 4 — Requirements (demand)
- [ ] Requirement list + detail + create/edit (acquisition criteria)
- [ ] Link requirement to operator Company/Contact

## Phase 5 — Matching engine (differentiator)
- [ ] Scoring function: location radius, sq ft/covers fit, use class, budget, tenure
- [ ] "Matches for this requirement" and "Requirements matching this unit" views
- [ ] Match reasons surfaced; one-click create Deal from a match
- [ ] (Stretch) LLM-assisted match explanations using Claude

## Verification (each phase)
- [ ] Manual run-through against seed data
- [ ] RLS tested (no cross-tenant leakage)
- [ ] Typecheck + lint clean

---

## Review
_(to be filled in as phases complete)_
