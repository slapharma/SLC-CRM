# CRM employee-flow test — 2026-07-22

Five persona agents (new employee, disposals agent, acquisitions agent, team manager, senior deal-maker) traced every workflow through the code, while a live browser session on production (QA test agency `qa.verify.silo.2026072201@…`) exercised the real UI end-to-end.

## Live smoke test — result: core loop PASSES

Created on prod QA agency (all records suffixed "(TEST)" — safe to delete):
contact **Testy McTestface** → listing **QA Test Tavern, Soho** (W1D 4NR, Sui Generis, 2,000 sq ft, £85k rent) → requirement **QA Soho bar brief** (W1 district, 1,500–2,500 sq ft, max £90k, Pub/Bar SG) → MatchMaker scored the pairing **100% with correct reason chips** (and a Camden listing got proximity credit "~1 mi from W1") → one-click **deal created** with parties + £85k value auto-linked → **reminder** added and surfaced on /messages.

Confirmed live during the test:
- **Requirement Location card hides district/county targets** — a W1-only brief displays "Towns: — / Regions: —" (`requirements/[id]/page.tsx:207-216`).
- **Detail pages keep the generic marketing `<title>`** — contact/listing/deal pages all show "CliftonAi-CRM — Leisure & Licensed Property" in the tab instead of the record name (missing `generateMetadata`).
- Geocoding, county derivation, silo tabs, stats bars all worked as designed.

---

## P0 — bugs that corrupt data or mislead daily decisions

1. **Dashboard KPIs count closed deals as open pipeline.** "Open deals" and "Pipeline value" sum ALL deals including `completed`/`fell_through` (`dashboard/page.tsx:49-77`). /deals computes it correctly — the two screens disagree. One £500k completed deal permanently inflates the dashboard.
2. **Intel resync destroys history.** `resyncIntelSource` deletes + reinserts intel rows with new UUIDs (`src/lib/actions/intel.ts:77-92`). FKs are `on delete set null/cascade`, so every resync severs deals' listing links, wipes "Sent ×N" chips + double-send warnings (pair key gone), and cascades away docs/areas/contacts added to intel rows. Fix: upsert on the existing `(agency_id, source, source_ref)` unique key; mark missing refs Withdrawn.
3. **A comma in search breaks list pages.** `q` is interpolated raw into PostgREST `.or()` (`listings/page.tsx:75`, `contacts/page.tsx:59`). Searching "Bar, Soho" errors the query and renders "No listings yet" — looks like data loss.
4. **Un-completing a deal never un-satisfies the requirement.** One misclick of "Completed" in the stage popover (no confirm) marks the linked brief `satisfied` and removes it from matching; moving the deal back does not reactivate it (`deals.ts:54-66,177-198`).
5. **Public intake is unreviewed + wildcard-mergeable.** Submissions go live as active matchable requirements with no triage. `ilike` company/contact match uses raw input (`public-intake.ts:100-127`) — a "%" company name attaches the requirement to the first company alphabetically. Agent + admin emails are hardcoded (`public-intake.ts:11-12`). No email is actually sent (bell notification only, result unchecked).
6. **Internal message "Open" link is unvalidated** (`messages.ts:37` → rendered as `<Link>` in inbox and bell). Any member can send teammates a button to an arbitrary external URL. Allowlist app-relative paths.
7. **PDF particulars show stale scraped rent.** `build-particulars.ts:84-104` prefers `rent_raw`/`premium_raw`, but editing a listing only writes numeric fields — the emailed PDF keeps the old scraped rent text. Also the manually-maintained area schedule (`disposal_areas`) never reaches the PDF (it reads scrape-only `floors`).
8. **Deal create/update failures are swallowed** — `if (error) redirect("/deals")` (`deals.ts:132,168`): a failed insert is indistinguishable from success. Same pattern: requirement delete + agent-sync errors ignored (`requirements.ts:91-104,168-181`), message-notification insert unchecked (`messages.ts:59-67`).

## P1 — wrong-but-recoverable behaviour

9. **Listing detail matches ignore requirement status** — satisfied/withdrawn briefs keep appearing as opportunities with a Create-deal button (`listings/[id]/page.tsx:101-105`; /matches filters correctly).
10. **Pipeline agent filter uses `created_by`**, not lead agent (`deals/page.tsx:63-100`) — "Sarah's deals" = deals Sarah *created*; handed-off deals vanish from her filter.
11. **Reminder done-toggle race** — done state comes from the client's stale hidden field (`deal-reminders.ts:67-73`); two people marking done re-opens it.
12. **Reminder notification targets `created_by`**, never the current lead agent (`deal-reminders.ts:42-55`); and nothing fires when `due_at` passes — no cron anywhere, deadlines only nag if someone opens the page.
13. **"My Messages" Reminders card is agency-wide** (`messages/page.tsx:36-42`) — every agent sees all deadlines under a page called "My"; no overdue styling there.
14. **Match-created deals start unassigned** — the modal has no lead-agent picker though the action supports it (`create-deal-button.tsx` vs `deals.ts:115`); assignment changes notify nobody.
15. **Dedupe redirect discards input** — creating a deal for an existing pair silently redirects, throwing away the typed title (`deals.ts:88-94`); dedupe also doesn't filter `agency_id`.
16. **Editing a scraped intel listing demands a contact** (`disposals.ts:155-156`) — blocked on fixing a typo until you attach an irrelevant CRM contact.
17. **Quick-create company modal hardcodes types** (Operator/Landlord/Agent/Vendor/Other, `creatable-select.tsx:163-170`) — ignores the editable `company_types` table; removed slugs get written verbatim.
18. **County/region targets get no proximity credit** (`score.ts:142-151`) — "Surrey" brief scores 0 for a listing 2 mi over the border while a town brief scores ~0.7; and raw substring matching makes target "Ash" a 100% hit on "Ashford" (`score.ts:194`).
19. **No duplicate protection anywhere** — no unique constraints, no pre-insert lookup, no warning for contacts/companies; CSV re-upload silently duplicates every row.
20. **Manager role is cosmetic** — layout gates on `role = "admin"` only (`layout.tsx:38-45`); manager gets a violet badge and nothing else.
21. **Send-history cap** — `limit(500)` newest-first (`matches/page.tsx:130`); older "Sent" chips and double-send warnings silently disappear on a busy book.
22. **Non-canonical statuses invisible** — scraped "Sold STC"/"Let Agreed" rows are counted in All but no status tile and unselectable in the filter (`listings/page.tsx:122-207`).

## P2 — polish

- Contact detail is "record not action": no activity log (enum supports it), no KYC path, marketing opt-in captured but displayed nowhere.
- No Sent view / delete / reply in the inbox; bell count stale until navigation; no unread badge on sidebar "My Messages".
- Activity timeline never shows *who* (`created_by` stored, never selected).
- No photo upload for manual listings → hero-less PDFs for CDG's own stock.
- No quick status change on listings (full edit form for Available → Under Offer); deals have the popover pattern to copy.
- `sort=source` sorts raw slugs; manual+intel rows print "manual" as Source label.
- Company/contact pickers are unbounded native `<select>`s; lists fetch entire tables (no pagination).
- CSV templates omit address fields → imported records never geocode or appear on maps; import can't link contacts to companies.
- `logActivity` revalidates /dashboard which reads no activities (intended feed never built).
- Detail pages missing per-record `<title>` (live-confirmed).
- Wizard contact picker lists contacts without emails; failure surfaces only after submit.
- Fire-and-forget `logDealShare` can be cancelled by the mailto navigation.

---

## Quick-fix checklist (small, low-risk, high leverage)

1. Dashboard: exclude `completed`/`fell_through` from Open deals + Pipeline value; add a separate "Won" stat.
2. Escape/strip `,()%_` from `q` before `.or()` filters (listings, contacts); add `email.ilike` to contact search.
3. `.eq("status","active")` on `listings/[id]` requirements fetch.
4. Allowlist `link` to app-relative paths in `sendMessage`.
5. Reactivate requirement when a deal leaves `completed` (or confirm dialog before satisfying).
6. Escape `%_` in public-intake `ilike`; move the two hardcoded emails to env vars.
7. Null out `rent_raw`/`premium_raw` when numerics are edited; fall back to `disposal_areas` in the PDF floor table.
8. Surface deal insert/update errors instead of redirecting; check `syncRequirementAgents` + notification inserts.
9. Toggle reminders by explicit intent, not client-supplied `!done`; notify `lead_agent_id ?? created_by`.
10. Pipeline filter: `created_by OR lead_agent_id OR deal_agents`.
11. Feed real `company_types` into the quick-create modal.
12. Show counties + districts on the requirement Location card.
13. Relax mandatory contact for non-manual listings on update.
14. Duplicate warning: pre-insert email/name lookup on contact/company create.
15. Add `generateMetadata` (record name → tab title) on contact/company/listing/requirement/deal detail pages.
16. Mount `SendDealModal` on the deal detail page (it already supports it).
17. County centroids into proximity points; word-boundary matching for free-text locations.
18. Filter /messages reminders to mine (created or lead), add overdue styling.

## Feature improvements — ranked

1. **Persist matches + proactive alerts** (the #1 Kato gap). A `matches` table with `suggested/shortlisted/rejected/converted` statuses already exists in the schema, unused. Score new/imported listings against active requirements on write, insert suggested rows, ping the requirement's agents. Unlocks dismissing bad matches and a shortlist workflow; today agents must remember to reopen /matches.
2. **Tasks + firing reminders.** Real `tasks` table (assignee, due, entity link, status) + a cron (Vercel/pg_cron) that converts due reminders into notifications/email. Today nothing in the system ever *fires* — all alerting is passive.
3. **Fee model + closed-business reporting.** `fee_percent`/`fee_amount`, invoice status, `completed_at`, and a /reports view (fees by agent/quarter, conversion, fell-through reasons). The CRM currently cannot answer "what did we bill this quarter".
4. **Stage history + stuck-deal signals.** `deal_stage_events` written on every stage change → time-in-stage, "no movement in 14 days" board badges, funnel conversion; add expected-close date + weighted pipeline.
5. **Listings ops:** photo upload for native instructions (gallery + PDF hero), one-click status transitions with auto-suggest from deal stage (offer → Under Offer, completed → Let/Sold), expose the dormant schema fields (lease terms, 1954 Act, VAT, rates, licensing) in a "Lease & statutory" section, bulk select/status/assign.
6. **Intel resync v2:** upsert by source_ref (preserves history), geocode on import, staleness stamp, mark-missing-as-withdrawn.
7. **Duplicate detection + merge tool**; import v2 (address columns, upsert keys, company-name resolution, dry-run preview, post-import geocode).
8. **Public intake triage queue** (`pending_review` status or intake table) + real Resend email to the agent.
9. **Email engagement tracking:** Resend webhook updating `external_sends` by the already-stored `provider_id` (delivered/opened/bounced), and `external_sends.deal_id` so a deal shows its outbound history.
10. **Comms v2:** assignment notifications (deal lead, requirement agents), reply/threading (`parent_id`), realtime bell, sidebar unread badge, actor names on activity timelines, @mentions in notes.
11. **Make manager mean something:** team reporting page (per-agent pipeline, overdue, workload) gated to admin+manager — or drop the role from the dropdown.
12. **Dashboard activity feed:** recent activities with actors, my tasks/reminders due, unread messages tile — the data all exists.

## Test data left in the QA agency (prod)

All clearly labelled, safe to delete: contact "Testy McTestface (QA)", listing "QA Test Tavern, Soho (TEST)", requirement "QA Soho bar brief (TEST)", deal "QA Test Deal - Tavern x Soho brief (TEST)" + one reminder.
