# SLC-CDG-CRM — Leisure Real Estate CRM (Kato-for-Agencies clone)

A commercial-property agency CRM for the UK **leisure & licensed sector** (restaurants,
bars, clubs, coffee shops). Modeled on Kato for Agencies, with a leisure-specific
domain layer.

- **Market / regulatory model:** UK (Use Classes E / Sui Generis, Licensing Act 2003)
- **Stack:** Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, RLS)
- **MVP scope:** CRM + Listings + Requirements + Matching engine
- **Later phases:** Marketing engine, ~~Deal pipeline / Heads of Terms~~ (✅ Phase 6), Client portals, Insights

## Phase 6 — Deal pipeline ✅ (schema already existed; built UI + actions)
- [x] Kanban board at `/deals` — one column per `deal_stage` (lead → viewing → offer →
      heads_of_terms → legal → completed → fell_through), per-card stage mover (native
      `<select>` → `updateDealStage`, no DnD dependency), count + indicative value per card
- [x] Deal detail `/deals/[id]` — linked listing / requirement / operator cards + editable
      form (title, stage, value, Heads of Terms, notes) via `updateDeal`; delete
- [x] `src/lib/actions/deals.ts` — `createDealFromMatch`, `updateDealStage`, `updateDeal`, `deleteDeal`
- [x] Verified: `tsc` clean · `eslint` clean · `next build` OK (`/deals`, `/deals/[id]` = ƒ)
- [ ] Live run-through against seed data (needs Supabase auth + a created deal) — pending

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
- [x] Activity timeline — log + view per record (reusable component, on companies) + recent activity feed + live KPI counts on the dashboard
- [x] Global search — top bar → `/search` across companies / contacts / listings / requirements

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
- [x] **One-click create Deal from a match** — `CreateDealButton` on the Matches page,
      requirement detail (matching listings) and listing detail (matching requirements).
      `createDealFromMatch` de-dupes on the (requirement, listing) pair, derives title +
      indicative value (guide → premium → rent), links the operator company, seeds stage `lead`.
- [ ] (stretch) LLM-assisted match explanations

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

---

# UPGRADES BATCH (17 items) — phased plan

Phased delivery; each phase ends with a build/lint check + quick verification before the next.

**Patterns to follow:** Listings = `disposals` table. Server actions in `src/lib/actions/*`; client-component forms in `src/components/*`. Multi-tenant RLS by `agency_id` (`currentAgencyId()`, `getAgencyMembers()`). Agent ownership = `lead_agent_id` + `*_agents` join tables; `activities` = polymorphic timeline. UI primitives in `src/components/ui/*`. DB keeps internal names `requirements`/`requirement`; only UI copy becomes "Enquiries".

**Scoping decisions (adjust on approval):**
- #3 route: rename `/requirements` → `/enquiries` (+ redirect); table names unchanged.
- #11 notifications/share: in-app notifications + reminders/deadlines in DB; "share by email/WhatsApp" = prefilled `mailto:` / `wa.me` links (no mail/WhatsApp backend exists).
- #4 Post to CDG: no public CDG submission API — formatted "Post to CDG" export/copy; Share = Web Share/copy link; Print = print view.
- #7: remove the CDG-import UI from the Listings page (keep scraper lib/scripts).
- Migrations: written to `supabase/migrations/`, applied to the linked Supabase project via MCP after a cost/safety confirm.

## Phase 0 — Schema + global rename
- [x] Migrations applied to live DB: `manager` enum value; `contacts.marketing_opt_in`; `disposal_documents` + `disposal-docs` bucket; `disposal_areas`; `deal_reminders` + `notifications`; `database.types.ts` regenerated (by parallel session)
- [x] #9a manager role in admin dropdowns + `asRole()`; 2 manager users seeded (agent4=Daniel Goldberg, agent5=Rachel Stein, Demo!2026)
- [x] #3/#5 copy relabel: all user-facing "Requirements"→"Enquiries", "Matching requirements/listings"→"MatchMaker Opportunities", "Matches" page→"MatchMaker Opportunities" (sidebar, list/new/edit/detail, form, dashboard, search, top-bar, company detail, listing detail, deals, landing)
- [x] #3 route move `/requirements`→`/enquiries`: folder moved (git mv), all route strings + sidebar NAV + revalidatePath + activities PATH updated (action MODULE path kept), `/requirements*`→`/enquiries*` redirect in next.config
- [x] Verified: tsc + eslint clean AND clean `next build` passes (all routes incl. /enquiries/*, /listings/new, /listings/[id]/edit present)

## Phase 1 — Records CRUD & relationship modals (#1, #12, #13, #14, #15)
- [x] #15 New Listing: button on Listings page + `disposal-form.tsx` + `createDisposal` action + `/listings/new`
- [x] #1 Edit Listing: `/listings/[id]/edit`, Edit button on detail, pen icon on each list row, `updateDisposal`
- [x] Reusable modal pattern: `ui/modal.tsx` (portalled) + `creatable-select.tsx` (CreatableSelect + Company/Contact wrappers) + `quickCreateCompany`/`quickCreateContact` actions (return `created` in FormState)
- [x] #13 New Company: "Add contact" field with "+ New contact" modal; `createCompany` links chosen contact via `link_contact`
- [x] #14 New Contact: company dropdown → "+ New company" modal; "Approves marketing communications" checkbox (`contacts.marketing_opt_in`)
- [x] #12 Enquiries form: operator company dropdown → "+ New company" modal
- [x] tsc clean — [ ] eslint (pending classifier) — [ ] browser verification (deferred to when other dev server stops, alongside route move)

## Phase 2 — Listings enhancements (#2, #4, #7, #10) — DONE (tsc+eslint clean)
- [x] #7 removed CDG-import block from Listings page (import-disposal-form.tsx now orphaned; scraper lib/scripts kept)
- [x] #2 PDF uploads: `disposal-documents.tsx` (upload to private `disposal-docs` bucket client-side → `addDisposalDocument`; signed-URL download; delete) + `disposal-documents` action file
- [x] #10 available-area schedule: `disposal-areas.tsx` editable table + `addDisposalArea`/`deleteDisposalArea`; "Available area" card on listing detail
- [x] #4 Share / Print / Post-to-CDG: `listing-share-actions.tsx` (Web Share/copy-link · window.print · copy particulars for CDG) in listing header
- [x] tsc + eslint clean — [ ] browser verification deferred

## Phase 3 — List sorting & filtering (#6) — DONE (tsc+eslint clean)
- [x] Shared `lib/sort.ts` + `sort-header.tsx` (URL-driven sortable column links) + `filter-bar.tsx` (`FilterBar` + `FilterSelect`, GET form preserving sort)
- [x] Companies (sort name/type; filter type), Contacts (sort name/role; filter role), Enquiries (sort title/max_rent/status; filter status), Listings (sort title/city/use_class/size/rent/status; filter status + disposal_type)

## Phase 4 — MatchMaker (#16) — DONE (tsc+eslint clean)
- [x] Stats bar (active enquiries · live listings · opportunities · avg score) + filters (min score, town/name keyword, use class)

## Phase 5 — Deals deep feature (#11, #17) — DONE (tsc+eslint clean)
- [x] #17 cards: created date + owner agent + "View deal" button on each kanban card
- [x] Detail: created date + owner in header; share buttons (email/WhatsApp via `deal-share-actions.tsx` + `logDealShare`)
- [x] Chronological updates/notes timeline (reuses LogActivityForm + ActivityTimeline, entity_type 'deal')
- [x] Deadlines + reminders: `deal-reminders.tsx` + `deal-reminders` actions (add/toggle/delete); overdue flag computed server-side (lib/time.ts)
- [x] In-app notifications: `notifications-bell.tsx` in top bar (server-fetched initial via layout, re-reads on open); reminder creation notifies the deal owner

## Phase 6 — Admin bulk import + agent visibility (#8, #9b)
- [x] #8 CSV import for Companies/Contacts/Enquiries/Listings in Admin (`lib/csv.ts` parser+templates, `import-data.ts` action, `data-import.tsx` UI) + downloadable CSV templates per entity. (XLS → "save as CSV"; SheetJS could be added for native .xls.)
- [x] #9b verified: Companies, Contacts, Listings already show lead + additional agents. GAPS REMAINING:
      - Enquiries have NO agent fields in the schema (0007 only added agents to companies/contacts/disposals) → needs a migration (requirements.lead_agent_id + requirement_agents) + form/display wiring.
      - Listing PDF shows only the source/CDG agent (agent_name), not the internal lead/additional agents → needs particulars-document + route change.
- [x] Verified: tsc + eslint clean AND full `next build` green (Phases 0–6)

## #9b completion — DONE (migration 0014 applied + build-green)
- [x] Enquiry agent assignment: migration `0014_requirement_agents` (requirements.lead_agent_id + requirement_agents table + RLS) applied to live DB; types regenerated
- [x] Enquiry form gains AgentFields (lead + additional); create/update actions sync requirement_agents; enquiry detail shows an "Agents" card
- [x] Listing PDF: "CDG Team" block lists internal lead + additional agents (particulars-document + route)

## Phase 7 — Heatmaps (added) — DONE (build-green)
- [x] Reusable `heatmap.tsx` (CSS-grid density matrix, teal scale, server-rendered)
- [x] Listings: town × status (driven by the page's existing status/type/search filters)
- [x] Companies: sector tag × company type (driven by the page's type/search filters)
- [x] Deals: stage × value band, with an agent filter

## FINAL STATUS
All 17 upgrade items + heatmaps + native .xls import implemented. Verified: tsc clean, eslint clean, full `next build` green; migrations 0011–0014 applied to live `slc-crm`.

Live browser verification (preview server, throwaway admin since the parallel session replaced demo logins with real CDG emails):
- Listings: New-listing button, Status/Type filters, town×status heatmap (live data), sortable headers, per-row Edit ✓
- New-listing form renders all sections + Lead/Additional agents ✓
- MatchMaker: stats bar (17/81/760/64%) + town/min-score/use-class filters + scored pairs ✓
- Admin: Import-data card, 4 entities, 4 templates, file inputs accept .xls, Manager role option ✓
- Deals: stage×value heatmap, agent filter, View-deal buttons; deal detail has Created date/agent, Reminders & deadlines, Updates & notes, Email/WhatsApp share ✓
- Enquiry detail: Agents card + Lead agent + MatchMaker Opportunities ✓
- KNOWN LIMITATION: server-action POSTs (create/edit) bounce to /login in the preview harness (cookie/Origin quirk) — could not exercise create/edit mutations there. Production build is green and the new mutations mirror existing working actions; confirm create/edit in a real browser.
- xlsx (SheetJS) added → npm audit reports advisories (2 moderate, 1 high) on the npm build; consider the CDN distribution if that matters.
- Throwaway verify-bot@slc.test account deleted after testing.

## Phase 7 — Heatmaps (added)
SVG/CSS heatmap visuals (no map/chart dep) rendered on each page, each with relevant filters.
- [ ] Reusable `Heatmap` component (matrix grid, colour-scaled cells, legend) + shared filter bar.
- [ ] Listings heatmap: density by **region/town × use class** (or status). Filters: status, use class, town/region, to-let/for-sale.
- [ ] Companies heatmap: density by **sector tag × company type** (or region). Filters: type, sector tag, lead agent.
- [ ] Deals heatmap: **stage × value band** (or stage × month). Filters: stage, lead agent, value band, date range.
- [ ] Build + lint

---

## Next session — requested backlog (cflack, 2026-06-30)

1. [ ] **Listings on company record cards** — show a company's related listings on its
       detail page (a "Listings" card alongside the existing Contacts/Activity cards).
       Source: `disposals` linked to the company; clickable rows through to each listing.
2. [ ] **Admin: edit contact role** — let an admin change a contact's role
       (acquisitions / landlord / solicitor / etc.) from the Admin area, not just the
       contact edit form. Mirror the existing Admin user/role editing pattern.
3. [ ] **Stats bar on Companies & Listings pages** — add a KPI/stats bar like the one
       already on Contacts (and MatchMaker's 17/81/760/64% bar). Counts/segments
       relevant to each page (e.g. companies by type; listings by status/use class).
4. [ ] **Contact on listings record** — add a contact (e.g. the landlord/agent contact)
       to a listing's detail, with a clickable link through to the contact record.
5. [ ] **External-source links in KYC report** — add links to Companies House (and other
       data sources) on the relevant data points in the KYC report.
6. [ ] **Deal record enrichment + named-deal creation flow**
       - [ ] Add lead agent + additional agents to deal records (reuse the AgentFields
             component already used on companies/contacts/listings/enquiries).
       - [ ] Show the deal's listing company + contact details with clickable links.
       - [ ] On "create deal", pop up a form to name the deal before creating
             (replace/extend the current `createDealFromMatch` flow with a title prompt).

---

# BATCH — Enquiries→Requirements rename, portfolio+map, links, listing type (cflack, 2026-07-01)

Decisions (from user this session):
- Enquiries page: **omit** geographic map (demand records aren't geographic) → portfolio-spread crosstab only.
- INTEL listing PDF: **neutral/unbranded + "Market intel — not for distribution"** marker.
- Route: **revert `/enquiries` → `/requirements`** (+ redirect the old path).
- Reuse the app's existing design system (Card · `Heatmap` crosstab · `ConcentrationMap` · Tailwind tokens) — no new design language.

Repo facts found during exploration (reduce the work):
- DB table is already `requirements` (only UI was renamed to "Enquiries" last batch — this reverses that).
- `disposals` + `requirements` already have `company_id` + `contact_id` columns.
- Listing form already has Company + Contact pickers; requirement form has Company but **not** Contact.
- "Portfolio Spread" == the `Heatmap` crosstab (`src/components/heatmap.tsx`); already on Listings + Companies.

## B1 — Enquiries → Requirements (site + route revert)
- [ ] `git mv src/app/(app)/enquiries` → `src/app/(app)/requirements` (4 pages).
- [ ] `next.config.ts` redirect flip: `/enquiries(/*)` → `/requirements(/*)`.
- [ ] Relabel all user-facing "Enquir…"/"enquiry" → "Requirement(s)" (sidebar, list/new/edit/detail, `requirement-form`, dashboard, `/matches`, deals, company detail, `/search`, top-bar, landing, admin, data-import).
- [ ] Update `/enquiries` → `/requirements` in actions (`requirements.ts`, `deals.ts`, `activities.ts` PATH, `import-data.ts`).
- [ ] CSV/import entity key `enquiries` → `requirements` (`csv.ts`, `import-data.ts`, `data-import.tsx`) — DB table mapping stays `requirements`.

## B2/B3 — Portfolio spread + geo map, compact 2-column
- [ ] `ConcentrationMap`: add optional `defaultActive?: MapKind` → initial active layer = page's category (toggles still work).
- [ ] `Heatmap`: compact variant (smaller cells) for side-by-side.
- [ ] Contacts page: 2-col — spread (role × company type) left, map (default contacts) right.
- [ ] Companies page: existing spread → 2-col + map (default companies).
- [ ] Listings page: existing spread → 2-col + map (default listings).
- [ ] Requirements page: add spread (target town × status), single column (map omitted).

## B4 — Contact + company fields on requirements + listings
- [ ] Listings: already wired — verify save + detail display.
- [ ] Requirements: add Contact picker to `requirement-form.tsx`; thread `contact_id` through `createRequirement`/`updateRequirement`; show company + contact on requirement detail.

## B5 — Listing primary type: CDG | INTEL
- [ ] Migration `0024_listing_type.sql`: `disposals.listing_type` text/enum `('cdg','intel')` default `'cdg'`; regen `database.types.ts`.
- [ ] "Type" selector in `disposal-form.tsx`; wire through disposal create/update action.
- [ ] CDG/INTEL badge on listing list + detail.
- [ ] Particulars PDF: thread `listing_type`; when `intel` → drop logo/phone/URL/CDG disclaimer, neutral header, add "Market intel — not for distribution".

## Verification
- [x] tsc + eslint + `next build` clean (twice — before and after review fixes).
- [x] Preview: /enquiries → /requirements redirect verified; /requirements + /dashboard render; Admin accordion + Add-agent toggle + Edit-company-types expand verified; CDG import panel gone from /listings.
- [ ] Full data verification of listings/company-types BLOCKED until migrations 0024+0025 applied to live DB (see below).

## Follow-on requests (same session)
- [x] Dashboard: 5 uniform quick-action buttons incl. "Add requirement"; recent-activity → listings location map; "Pipeline value" KPI (sum deal values).
- [x] Admin: Add-agent moved into Team panel header (inline form); "Edit roles" → "Edit contact roles"; new "Edit company types" panel (editable, migration 0025); all panels collapsible (CollapsibleCard); MS Outlook (email+calendar) connector placeholder.
- [x] Mandatory contact on every listing + requirement (form `required` + server validation + CSV import contact_email resolution); company optional on listings.
- [x] Removed "Import from CDG Leisure" panel from Listings page.

## Adversarial review (workflow, 6 dimensions × verify) — 4 real bugs found + FIXED
- [x] CSV import created listings/requirements with null contact_id → now resolves required `contact_email`.
- [x] seed `dummy_data.sql` referenced dropped `company_type` enum → changed to `text[]`.
- [x] CSV company `type` validated against stale enum → now against live `company_types` slugs.
- [x] `companyTypeBadge` shown stale labels for renamed types → threaded `typeLabel()` on companies list/detail, search, listing detail (+ tiles/heatmap derive from live types).
- Known limits (accepted): mandatory-contact enforced at app+CSV layer, NOT a DB NOT NULL (existing rows/CDG scraper have null contact_id); INTEL PDF keeps the teal accent (CDG wordmark/contact/disclaimer removed).

## ⚠️ ACTION REQUIRED — apply migrations to live DB (slc-crm / akxortffkrknoxysgeei)
Both were blocked by the production-safety gate; app is degraded until applied:
- `0024_listing_type.sql` — adds `disposals.listing_type` (additive, safe).
- `0025_company_types.sql` — converts `companies.type` enum→text, adds `company_types` table, DROPS `company_type` enum, seeds 5 defaults.
After applying: regenerate `database.types.ts` (hand-edits already match), and re-run `dummy_data.sql` only if resetting demo data.

## Review
Shipped Enquiries→Requirements rename, portfolio-spread+geo-map across list pages, contact/company links, listing CDG/INTEL type + unbranded INTEL PDF, dashboard refresh, Admin accordion redesign + editable company types, and mandatory-contact enforcement. All gated behind two DB migrations awaiting authorization.
