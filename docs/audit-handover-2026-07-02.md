# Audit Handover — Performance, Stability & UI/UX

**Date:** 2026-07-02
**Branch at time of audit:** `feat/requirements-listing-type-company-types`
**Scope:** Full static audit of `src/` (155 files, 29 routes) across six dimensions: data layer, rendering/caching, client bundle, stability/error handling, accessibility/UX patterns, visual consistency, and responsive/mobile.
**Method:** Eight parallel read-only audit agents (four performance/stability, four UI/UX), with the highest-impact claims manually verified against the code before inclusion. No source files were modified.

---

## 1. How to read this doc

- Every finding has file references. Line numbers were correct on the audit date; re-verify before editing.
- Section 8 lists claims that were **checked and disproven** — do not "fix" those.
- Section 9 lists what already works well — do not regress it.
- Section 10 is the suggested implementation roadmap in phases, with effort estimates.
- Repo gotchas that bite implementers are in Section 11.

---

## 2. Executive summary

**Performance:** The app renders every page dynamically (correct for an auth-gated CRM) but with zero streaming — there is not a single `loading.tsx`, `error.tsx`, or `Suspense` boundary in the app, so every page blocks on its slowest query and any thrown query becomes an unstyled 500. On top of that, several pages over-query: whole-table `select("*")` fetches, sequential awaits (listing detail makes ~8 serial round-trips), and `getMapLayers()` re-fetching three entire tables on pages that already hold the data.

**Stability:** Every external API call (OpenRouter, Companies House, OFSI, Google Maps, CDN image fetches) is made with **no timeout** — one hung third party hangs the whole request until the platform 504s. There is also an unguarded `res.json()`, a null-cast crash in the disposals importer, and a lost-update race on record edits.

**UI/UX:** Genuinely strong baseline (see §9). The real gaps: tables are desktop-only (no responsive column hiding anywhere), the shared Modal has no max-height, the same alert markup is copy-pasted into 13 files, three nested delete buttons lack pending states, and two components have invisible keyboard focus.

---

## 3. Performance findings (ranked)

### P1. No streaming / no error boundaries — app-wide
- **Evidence:** `Glob src/app/**/{loading,error}.tsx` returns zero files. No `<Suspense>` usage.
- **Impact:** Every page waits for its slowest query before first paint; one failed query = raw 500.
- **Fix:** Add `src/app/(app)/loading.tsx` (skeleton), `src/app/(app)/error.tsx` + a root `global-error.tsx` (retry button), then wrap slow islands (`ConcentrationMap`, matches scoring, `DeepDiveView`, KYC report) in `<Suspense>` with sized fallbacks.
- **Note:** Keep `export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx:14` — it is intentional (see §8).

### P2. `getMapLayers()` re-fetches three full tables — `src/lib/supabase/map-points.ts:22-90`
- Fetches ALL disposals (including the heavy `images` JSON arrays), ALL companies, ALL contacts. Called on dashboard, listings, companies, and contacts pages — which have usually already queried the same rows.
- **Fix:** Drop `images` from the select; fetch only `id, lat, lng, title, status`-level fields; where the page already has filtered rows, pass them in rather than re-querying.

### P3. Listing detail page: ~8 sequential queries — `src/app/(app)/listings/[id]/page.tsx:62-136`
- After the initial disposal fetch, requirements → deals → disposal_agents → documents → areas → lead-agent profile are awaited one after another. Only the final company+contact pair uses `Promise.all` (line ~140).
- **Fix:** Wrap all queries after the disposal fetch in one `Promise.all`. Also narrow the two `select("*")` calls (disposal at line 62, requirements at line 75 — requirements only needs the fields `scoreMatch` reads).

### P4. Per-document signed URLs — same file, lines 97-109
- One `supabase.storage.createSignedUrl()` call per document.
- **Fix:** Use the batch API `createSignedUrls(paths[], 3600)` — one storage round-trip instead of N.

### P5. Matches page cartesian product — `src/app/(app)/matches/page.tsx:38-62`
- Fetches every requirement and every disposal with `select("*")`, scores every pair in memory (~4,000+ today, grows N×M), renders top 50.
- **Fix (near-term):** Narrow both selects to the fields `scoreMatch` uses; filter non-matchable listing statuses in the query, not in JS.
- **Fix (later):** Pre-compute matches into a table, refreshed when a requirement/listing changes; invalidate with `revalidateTag("matches")`.

### P6. Reference data fetched per request — `src/lib/company-types.ts`, `src/lib/contact-roles.ts`
- Both use React `cache()`, which only dedupes within a single request. These tables change only via Admin.
- **Fix:** Wrap in `unstable_cache(..., { tags: ["company_types"] })` (or `'use cache'` — check the Next version's docs in `node_modules/next/dist/docs/` first, see §11) with a long revalidate; call `revalidateTag()` from the admin mutations in `src/lib/actions/company-types.ts` / contact-roles actions.
- **Do NOT** call `revalidateTag()` inside the getter itself (one agent suggested this — it's wrong API usage; `revalidateTag` is for mutations).

### P7. Client bundle
- `src/components/data-import.tsx:7` — `import * as XLSX from "xlsx"` (~120KB gz) at module level, used only inside the file-picker handler. **Fix:** `const XLSX = await import("xlsx")` inside `onFile`.
- `src/components/deep-dive-view.tsx:5` — `react-markdown` + `remark-gfm` (~50KB gz) eager on every company detail page, even with no report. **Fix:** `next/dynamic` a small markdown-renderer subcomponent.
- `src/components/concentration-map.tsx` — mounts the ~1.5MB Google Maps script wherever it renders. **Fix:** `dynamic(() => import(...), { ssr: false, loading: <sized skeleton> })`.

### P8. Smaller items
- Layout admin-check + notifications queries run sequentially on every navigation — `src/app/(app)/layout.tsx:38-52`. `Promise.all` them.
- List pages (listings/companies/contacts/requirements) fetch with no `.limit()`, then filter town/status **in JS**; heatmap tiles run 6+ `.filter()` passes over the same rows. Push filters into the query where possible; build tile counts with a single `reduce`.
- Dashboard (`src/app/(app)/dashboard/page.tsx:41-66`) calls `getMapLayers` on top of its count queries — duplicated data; a minimal lat/lng query suffices.
- `next.config.ts`: consider `images.formats: ["image/avif", "image/webp"]`; confirm `productionBrowserSourceMaps` is not enabled.

---

## 4. Stability findings (ranked)

### S1. No timeouts on any external fetch — **top priority, mechanical fix**
Add `signal: AbortSignal.timeout(10_000)` (5s for OFSI, which already degrades gracefully) to:
- `src/lib/openrouter/client.ts:19` (Deep Dive)
- `src/lib/kyc/companies-house.ts:26` (`chFetch`)
- `src/lib/kyc/sanctions.ts:79` (OFSI consolidated list)
- `src/lib/maps/geocode.ts:41`
- `src/lib/disposals/cdg.ts:~590` (scraper fetch)
- `src/app/(app)/listings/[id]/particulars/route.ts:31,48` (`fetchHero` / `fetchStaticMap`)

Failure mode today: a hung third party hangs the user's request until a platform 504 (Deep Dive, KYC, address save, PDF download).

### S2. Unguarded `res.json()` — `src/lib/openrouter/client.ts:46`
A 200 response with a malformed body throws a raw `SyntaxError` out of the deep-dive flow. Wrap in try/catch and throw a labelled error ("OpenRouter returned invalid JSON: …").

### S3. Null-cast crash in importer — `src/lib/disposals/import.ts:88`
Checks `error` but then does `(data as { id: string }).id`. If `.single()` returns no row, `data` is null and this crashes. Add `if (!data) throw new Error("Upsert returned no data")`.

### S4. Lost-update race on record edits
- `src/lib/actions/contacts.ts:122-133`, `src/lib/actions/disposals.ts:156-167`, `src/lib/actions/companies.ts:173-195`
- Pattern: read row → await geocoding (1–2s) → write. Two concurrent editors silently overwrite each other.
- **Fix:** optimistic concurrency — include `updated_at` in the read, add `.eq("updated_at", existing.updated_at)` to the update, and surface "modified elsewhere — refresh and retry" when zero rows match. Requires an `updated_at` column maintained by trigger (check schema; may need a small migration).

### S5. Silent config degradation
Missing `GOOGLE_MAPS_SERVER_KEY` → geocoding silently no-ops (records saved with null lat/lng, blank PDF maps). Same pattern for OpenRouter/Companies House keys (though those at least show "not configured" in the UI). Add a one-time server-side `console.warn` per missing key so ops can see it in logs.

### S6. Minor
- Email format not validated in CSV import — `src/lib/actions/import-data.ts:~100`.
- Null-guard style (`?? []`) is applied broadly but inconsistently; consider a `safeSelect` helper when touching those files anyway.

---

## 5. UI/UX findings — accessibility & interaction

The a11y baseline is strong (labels, aria-labels on icon buttons, focus rings on primitives, reduced-motion guard, alt text, color-plus-text badges). Verified defects:

| # | Finding | File | Fix |
|---|---------|------|-----|
| A1 | `focus-visible:outline-none` with **no replacement ring** — keyboard focus invisible | `src/components/ui/collapsible-card.tsx:35`, `src/components/admin-panel.tsx:117` | Append `focus-visible:ring-2 focus-visible:ring-ring` (every other usage in the app pairs them correctly — verified via grep) |
| A2 | Log-activity textarea has placeholder only, no label | `src/components/log-activity-form.tsx:59` | Add `<Label htmlFor>` (and consider visible labels for the row's select/inputs, lines 38-57) |
| A3 | Area-row delete button is 28×28px (`h-7 w-7`) | `src/components/disposal-areas.tsx:89` | Bump to `h-9 w-9` minimum |
| A4 | NumberRange min/max inputs use aria-label only | `src/components/requirement-form.tsx:336-353` | Optional: visible Min/Max labels |

## 6. UI/UX findings — UX patterns, consistency, responsive

### U1. Tables are desktop-only (highest UI priority)
- **Verified:** zero occurrences of `hidden md:table-cell` (or sm/lg variants) in the entire codebase.
- Listings (7 cols), Contacts (5), Companies (4+), Requirements (5) all render every column at 375px; the `overflow-x-auto` wrapper makes it scroll rather than break, but horizontal-scrolling tables are poor field UX.
- **Fix:** add `hidden md:table-cell` to secondary columns (email/phone, use class, size sqft/sqm, sectors, website) so mobile collapses to roughly Name + Status + action. Files: the four list `page.tsx` files.

### U2. Modal has no max-height — `src/components/ui/modal.tsx:42`
- **Verified:** `max-w-md` only. Tall content (message composer on a short phone) can extend past the viewport with the submit button unreachable.
- **Fix:** add `max-h-[90vh] overflow-y-auto` to the content div. One line, fixes every dialog (compose message, pin detail, etc.).

### U3. Duplicated alert markup — 13 files (verified by grep)
- The literal string `border-red-200 bg-red-50 …` appears in: auth-form, admin-panel, company-form, contact-form, creatable-select, deep-dive-view, disposal-assignment-form, disposal-form, kyc/kyc-report-view, requirement-form, send-to-team, compose-message (+ `ui/badge.tsx`, which is legitimate). Emerald success and amber warning variants are similarly copy-pasted (~17 call sites total).
- **Fix:** create `src/components/ui/alert.tsx` with `tone: "error" | "success" | "warning"`; replace all call sites. This is also the single place to reconcile the color drift: hardcoded emerald-600 (`#059669`) vs the `--success` token (`#047857`), amber-600 vs `--warning`.

### U4. Nested deletes lack pending states
- `src/components/disposal-areas.tsx:86-101`, `src/components/disposal-documents.tsx:116-135`, `src/components/deal-reminders.tsx:64-80` use a raw `window.confirm` button with no disabled/pending state while the delete submits (double-click risk, no feedback on slow connections).
- **Fix:** migrate to the existing `src/components/confirm-submit-button.tsx` pattern (already used by the five main record deletes — it handles confirm + `useFormStatus` pending).

### U5. Notifications dropdown can clip at 375px — `src/components/notifications-bell.tsx:~80`
- `w-80` (320px) anchored `right-0`, not portaled. **Fix:** `w-[min(320px,calc(100vw-24px))]`.

### U6. "Showing N of M" counts missing on list pages
- Because town/status filtering happens in memory after the query, users can't tell 5 results from 5-of-120. Add a count line above each table when filters are active. Pairs naturally with the pagination work in P8.

### U7. Heatmaps unreadable at phone width
- `src/components/heatmap.tsx:52-58` — grid columns compute to ~30px at 375px with 8 columns. Either `hidden sm:block` on mobile or a tighter compact variant.

### U8. Polish (low)
- Unsaved-changes warning on long forms (DisposalForm especially) — small shared dirty-state hook.
- Dashboard KPI cards use `hover:shadow-md` (`src/app/(app)/dashboard/page.tsx:~107`) — the project's own `design-system/slc-crm/MASTER.md` §5 says no layout-shifting hovers; keep the border-color change only.
- `sm:grid-cols-3` rows in `src/components/disposal-form.tsx` (lines ~138, ~197) are cramped at 640–768px — use `md:grid-cols-3`.
- Form spacing `space-y-5` vs `space-y-8` varies between forms — standardize or document in MASTER.md.
- Dashboard logo uses raw `<img>` (`dashboard/page.tsx:84-89`) with an eslint-disable — cosmetic.

---

## 7. Findings summary matrix

| ID | Area | Severity | Effort | Files touched |
|----|------|----------|--------|---------------|
| S1 | Timeouts on external fetches | Critical | ~1h | 6 |
| S2 | OpenRouter JSON guard | Critical | 10m | 1 |
| S3 | Importer null cast | Critical | 5m | 1 |
| P1 | loading/error/Suspense | High | ~half day | new files + islands |
| P2 | getMapLayers over-fetch | High | ~2h | 1 + call sites |
| P3 | Listing detail Promise.all | High | ~1h | 1 |
| P4 | createSignedUrls batch | High | 20m | 1 |
| U1 | Table column hiding | High | ~30m | 4 |
| U2 | Modal max-height | High | 5m | 1 |
| U3 | Alert component | High | ~2h | 1 new + 17 sites |
| A1 | Focus rings | Medium | 5m | 2 |
| U4 | Nested delete pending | Medium | ~30m | 3 |
| U5 | Dropdown width | Medium | 10m | 1 |
| P5 | Matches page selects | Medium | ~1h | 1 |
| P6 | Reference-data caching | Medium | ~1h | 2 + admin actions |
| P7 | Bundle: xlsx/markdown/map | Medium | ~1h | 3 |
| S4 | Optimistic locking | Medium | ~half day | 3 + possible migration |
| S5 | Config warnings | Low | 30m | 3 |
| U6–U8, A2–A4, P8, S6 | Polish | Low | as listed | — |

---

## 8. Verified corrections — do NOT act on these

Claims made by audit agents that were **checked against the code and found wrong or overstated**:

1. **"`@react-pdf/renderer` bloats the client bundle"** — FALSE. Verified by grep: it is imported only in server route handlers (`companies/[id]/deep-dive/route.ts`, `listings/[id]/particulars/route.ts`) and `src/lib/pdf/*` used by them. It never ships to the browser. Do not "move it off the client".
2. **"Remove `force-dynamic` / make the (app) group cacheable with ISR"** — OVERSTATED. The layout comment (`layout.tsx:9-13`) explains it: every page is auth-gated and cookie-reading, and force-dynamic also keeps `next build` from evaluating pages when Supabase env vars are absent (CI). Keep it. The win is streaming (P1), not static rendering.
3. **"Call `revalidateTag()` inside the cached getter"** — WRONG API usage. `revalidateTag` invalidates from mutations; the getter should use `unstable_cache`/`'use cache'` with a tag.
4. **"3-column form grids break at 375px"** — the same agent corrected itself mid-report: `sm:grid-cols-3` correctly collapses to 1 column below 640px. The only real issue is tightness at 640–768px (U8).
5. One agent flagged `src/lib/actions/company-types.ts:44` as a null-deref risk, then noted it already uses `?? []` — it's safe. Filed under "consistency", not a bug.
6. `src/app/api/disposals/import/route.ts` was checked for missing auth and is **properly secured** (auth + membership checks present).

---

## 9. What already works well — do not regress

- **Empty states**: shared `EmptyState` component with CTA on all 10+ list pages; distinguishes "no data yet" from "no filter matches".
- **Pending states**: all primary forms use `useFormStatus` ("Saving…", "Creating…", "Researching…"); `ConfirmSubmitButton` handles confirm + pending for the five record deletes.
- **Error handling in forms**: `useActionState` + inline alert; input preserved on error via `defaultValue`.
- **Filters**: URL-persisted (shareable, back-button-safe), active-state tiles, Clear affordance, filters compose without resetting each other.
- **Theming**: 24 CSS tokens with full light/dark coverage, theme toggle, Tailwind v4 `@theme` mapping, no `!important`, no dead CSS.
- **Mobile nav**: portaled to body (fixes the 2026-06-30 backdrop-blur stacking bug — do not un-portal), body scroll lock, focus management, Escape, close-on-navigate.
- **z-index scale**: clean 30 (top bar) / 40 (backdrops) / 50 (drawer, dropdown, modal); no ad-hoc `z-[999]`.
- **Icons**: Lucide only; `[&_svg]:size-4` rule in `ui/button.tsx` enforces sizing.
- **Mobile inputs**: 16px font under 640px in `globals.css:194-200` (no iOS zoom).
- **Reduced motion**: guarded in `globals.css:179-182`.
- **Button hierarchy, heading scale (`PageHeader`), radius/shadow discipline**: consistent.

---

## 10. Recommended roadmap

**Phase 1 — critical stability + quick wins (~1 day)**
S1 timeouts, S2 JSON guard, S3 null check, P3 `Promise.all` on listing detail + layout, P4 `createSignedUrls`, U2 modal max-height, A1 focus rings, U5 dropdown width, U8 KPI hover shadow.

**Phase 2 — perceived speed + mobile (~1–2 days)**
P1 loading.tsx/error.tsx/Suspense, P7 dynamic imports (xlsx, react-markdown, ConcentrationMap), U1 table column hiding, U3 Alert component extraction, U4 nested delete pending states.

**Phase 3 — structural (~2–3 days)**
P2 getMapLayers slimming, P5 matches select narrowing (pre-computed matches table as follow-up), P6 tagged caching for reference tables, S4 optimistic locking (+ migration if `updated_at` isn't auto-maintained), U6 counts + pagination, S5 config warnings, remaining polish.

Each phase is independently shippable. Phases 1–2 give most of the user-visible improvement.

---

## 11. Repo context & gotchas for the implementer

- **Read `AGENTS.md` first**: this project runs a Next.js version with breaking changes vs. common knowledge — check `node_modules/next/dist/docs/` before using caching/streaming APIs (relevant to P1/P6).
- **Migrations 0024 & 0025 are written but NOT applied to the live DB** (listing_type cdg|intel; editable company_types dropping the enum). Anything touching disposals/company-type queries should account for the live schema possibly lagging the code.
- **Branch state**: audit ran on `feat/requirements-listing-type-company-types` with uncommitted changes to `globals.css` and `top-bar.tsx`, plus untracked `guide/` page and `guide-journey.tsx`. Re-run line-number checks after that lands.
- **CardContent quirk**: zeroes top padding on sm+; headerless form cards patch with `pt-4 sm:pt-6`. Follow the existing pattern.
- **Vercel**: deployment has SSO protection ON — 401s on the deployed URL are expected, not a regression.
- **Design system source of truth**: `design-system/slc-crm/MASTER.md` (hover/layout-shift rules, spacing, QA gates). The `window.confirm` pattern for deletes is a deliberate choice — accessible and simple; don't replace with a styled AlertDialog unless asked.
- **Testing**: create a throwaway account via `/sign-up` for an isolated pre-seeded agency; don't reset the real CDG member emails.
