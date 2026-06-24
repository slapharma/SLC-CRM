# Design System — SLC-CRM (Master / Source of Truth)

> **LOGIC:** When building a page, first check `design-system/slc-crm/pages/[page].md`.
> If it exists, its rules **override** this file. Otherwise follow this file strictly.

**Project:** SLC-CRM — B2B CRM for the UK leisure & licensed commercial-property sector
**Style:** Minimalism & Swiss — clean, dense, functional, grid-based, high-contrast
**Reference feel:** Kato / Linear / modern property-tech (utilitarian, trustworthy, fast)
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Geist
**Surface:** desktop-first internal tool (data-dense), responsive down to tablet/mobile

> **Corrections vs auto-generated draft:** the generator over-indexed on "real estate
> luxury" and proposed display serifs (Cinzel/Josefin) and a landing-page "Before-After"
> pattern. Both are **rejected** — this is an internal data tool, not a brochure. We keep
> only the *Swiss minimalism* style and the *trust-teal + professional-blue* palette.

---

## 1. Design principles

1. **Density with air** — show a lot without clutter. Tight, consistent spacing; let whitespace and hairline borders (not shadows) do the separating.
2. **Legibility first** — numbers, money, areas and references are the product. Tabular, monospaced figures; never let type styling fight the data.
3. **Calm chrome, loud data** — UI furniture (nav, toolbars) is neutral slate; colour is reserved for status, meaning and the single primary action.
4. **One primary action per view** — teal primary button. Everything else is secondary/ghost.
5. **Status is colour-coded and labelled** — colour is never the *only* signal (a11y); always pair with text/icon.
6. **Keyboard-first** — this is a tool used all day. Visible focus rings, logical tab order, `/` to search, shortcuts where sensible.

---

## 2. Color tokens (shadcn-compatible, light + dark)

Token names match shadcn/ui so components theme automatically. Values are authored as
HSL channels in `globals.css` under `@theme` / `:root` / `.dark` (Tailwind v4 — exact
syntax confirmed during stack research before implementation).

### Core (light → dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0B1220` | App background |
| `--foreground` | `#0F172A` (slate-900) | `#E2E8F0` (slate-200) | Primary text |
| `--card` | `#FFFFFF` | `#0F172A` | Card/surface |
| `--card-foreground` | `#0F172A` | `#E2E8F0` | Text on card |
| `--popover` / `--popover-foreground` | `#FFFFFF` / `#0F172A` | `#0F172A` / `#E2E8F0` | Menus, dropdowns |
| `--muted` | `#F1F5F9` (slate-100) | `#1E293B` (slate-800) | Subtle fills, table header |
| `--muted-foreground` | `#475569` (slate-600) | `#94A3B8` (slate-400) | Secondary text, labels |
| `--border` | `#E2E8F0` (slate-200) | `#1E293B` (slate-800) | Hairlines, dividers |
| `--input` | `#E2E8F0` | `#334155` (slate-700) | Input borders |
| `--ring` | `#0F766E` (teal-700) | `#2DD4BF` (teal-400) | Focus ring |

### Brand & action

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `#0F766E` (teal-700) | `#14B8A6` (teal-500) | Primary buttons, active nav, key accents |
| `--primary-foreground` | `#FFFFFF` | `#042F2E` | Text on primary |
| `--secondary` | `#F1F5F9` | `#1E293B` | Secondary buttons |
| `--secondary-foreground` | `#0F172A` | `#E2E8F0` | Text on secondary |
| `--accent` | `#0369A1` (sky-700) | `#38BDF8` (sky-400) | Links, info accents, focus highlights |
| `--accent-foreground` | `#FFFFFF` | `#082F49` | Text on accent |
| `--destructive` | `#DC2626` (red-600) | `#F87171` (red-400) | Destructive actions |
| `--destructive-foreground` | `#FFFFFF` | `#450A0A` | Text on destructive |

Primary teal carries WCAG AA on white (#0F766E ≈ 4.7:1). Use `primary` for the one main
action; use `accent` (blue) for hyperlinks and informational emphasis so the two never
compete.

### Semantic status (fills are `-50/-100` tints in light, `-950/900` in dark; text is `-700/-300`)

| Meaning | Hue | Light text / fill | Dark text / fill |
|---|---|---|---|
| Success / positive | emerald | `#047857` / `#ECFDF5` | `#6EE7B7` / `#022C22` |
| Warning / pending | amber | `#B45309` / `#FFFBEB` | `#FCD34D` / `#1C1407` |
| Danger / negative | red | `#B91C1C` / `#FEF2F2` | `#FCA5A5` / `#1A0606` |
| Info / neutral-note | sky | `#0369A1` / `#F0F9FF` | `#7DD3FC` / `#08243A` |

### Domain badge palettes (CRM-specific — always label + colour)

**Listing status:** Available → emerald · Under Offer (U.O.) → amber · Let → sky · Sold → violet · Withdrawn/Unavailable → slate.

**Deal stage (sequential, left→right warm-to-cool):** Lead → slate · Viewing → sky · Offer → amber · Heads of Terms → indigo · Legal → violet · Completed → emerald · Fell through → red.

**Use class:** E (Commercial/Business/Service) → sky · Sui Generis–Pub/Bar → violet · Sui Generis–Nightclub → indigo · Sui Generis–Hot-food takeaway → orange · Legacy A3/A4/A5 → slate (with the letter shown).

**Premises licence:** Held → emerald (with hours) · Late licence → teal · None → slate-outline.

**Tenure:** Freehold → emerald · Leasehold → sky · Assignment → amber · New letting → teal.

> Implement these as a typed `badgeVariant(domain, value)` map, not ad-hoc classes, so
> colour↔meaning stays consistent everywhere.

### chart-1…5 (for the dashboard, colour-blind-safer ordering)
`#0F766E` (teal) · `#0369A1` (blue) · `#B45309` (amber) · `#7C3AED` (violet) · `#475569` (slate).

### sidebar tokens
`--sidebar` `#F8FAFC` (light) / `#0B1220` (dark); `--sidebar-foreground` slate-700/300;
`--sidebar-accent` (hover/active) teal-50 / teal-950; `--sidebar-border` slate-200/800.

---

## 3. Typography

- **UI / body:** **Geist Sans** (already bundled via `next/font` — no network cost).
- **Numeric / tabular / references:** **Geist Mono** — money, sq ft / sq m, covers, rates, dates, IDs, postcodes. Use `font-variant-numeric: tabular-nums`.
- Rationale: Geist is a neutral grotesque (Linear-like) ideal for dense UI; mono for data keeps columns aligned and scannable. **No display serifs.**

| Role | Size | Weight | Line-height | Notes |
|---|---|---|---|---|
| Display (marketing h1) | 32–40px | 600 | 1.1 | Public pages only |
| Page title (h1) | 24px | 600 | 1.25 | App page header |
| Section (h2) | 18px | 600 | 1.3 | Card/section headers |
| Subsection (h3) | 15px | 600 | 1.4 | |
| Body / default UI | **14px** | 400 | 1.5 | Desktop tool base |
| Body (marketing/long-form) | 16px | 400 | 1.6 | Public/auth pages |
| Label / meta | 12–13px | 500 | 1.4 | Uppercase tracking-wide for table headers |
| Data (mono) | 13–14px | 500 | 1.4 | `tabular-nums` |

> **Mobile a11y:** form `<input>`/`<textarea>` font-size **≥16px** to prevent iOS zoom,
> even though the desktop UI base is 14px.

---

## 4. Spacing, radius, shadow, motion

- **Spacing:** 4px base — `1=4 2=8 3=12 4=16 6=24 8=32 12=48`. Default control padding `px-3 py-2`; card padding `p-4`/`p-6`; page gutter `px-6`.
- **Radius:** `--radius` = `0.5rem` (8px) default; sm 6px (badges/inputs), lg 12px (cards/modals), full (avatars/pills).
- **Shadow (restrained — Swiss prefers borders):** `sm` `0 1px 2px rgb(0 0 0/0.04)` for raised buttons; `md` `0 4px 12px rgb(0 0 0/0.08)` for popovers/dropdowns; `lg` `0 12px 32px rgb(0 0 0/0.12)` for modals. Cards use **border, not shadow**, by default.
- **Motion:** 150–200ms `ease-out` for hovers/menus; 200–250ms for dialogs. Animate `opacity`/`transform`/`background-color` only. Respect `prefers-reduced-motion`.

---

## 5. Component patterns

**App shell:** fixed left **sidebar** (240px, collapsible to 64px icon-rail) + **top bar** (56px: global search, create, notifications, account) + scrollable content (`max-w` none for tables; `max-w-3xl` for forms).

**Sidebar nav:** grouped sections (Workspace / Records / Insights). Item = icon + label, 36px tall, `rounded-md`; active = teal text + `--sidebar-accent` fill + 2px left teal marker; hover = muted fill. Lucide icons, 18px.

**Data table** (the workhorse): sticky header (`--muted`, 12px uppercase labels), 40px rows (compact mode 32px), hairline row borders, zebra optional, hover row highlight, checkbox column for bulk actions, right-aligned numeric/mono columns, sortable headers, sticky first column on overflow, `overflow-x-auto` wrapper. Bulk action bar appears on selection. Empty state with icon + primary CTA. Always offer pagination or virtualization for >100 rows.

**Filter bar:** above tables — segmented/pill filters + search + faceted dropdowns (town, use class, status, tenure, £ range, sq ft range). Active filters render as removable chips; "Clear all".

**Cards:** `border` + `rounded-lg` + `p-4/6`, header (h2 + optional action), no default shadow; hover only if the whole card is a link (then `cursor-pointer` + subtle border/bg change, **no layout-shifting scale**).

**Forms:** single column, grouped fieldsets, labels above inputs, 16px inputs, helper/error text below, required `*`, validate on blur, inline errors near field, sticky save bar on long forms, disabled+spinner on submit, optimistic where safe. Use react-hook-form + zod (confirm in stack research).

**Badges/pills:** `rounded-md`/`rounded-full`, 12px, 500 weight, tint fill + darker text per the domain palettes above; always include a text label (never colour-only).

**Activity timeline:** vertical line, dot per event (type-coloured), actor + verb + target + relative time; group by day.

**Buttons:** primary (teal solid) · secondary (slate outline) · ghost (text) · destructive (red). 36px default height, `rounded-md`, `cursor-pointer`, focus-visible ring.

**Toasts/feedback:** bottom-right, status-coloured left border + icon; loading→success/error on all mutations.

---

## 6. Accessibility & quality gates (enforced pre-delivery)

- [ ] Contrast ≥ 4.5:1 body / 3:1 large & UI; **colour never the only signal**
- [ ] Visible `focus-visible` rings (teal `--ring`) on every interactive element
- [ ] Icon-only buttons have `aria-label`; images have alt; inputs have `<label for>`
- [ ] Tab order matches visual order; menus/dialogs keyboard-operable + focus-trapped
- [ ] Touch targets ≥ 44px on mobile; `cursor-pointer` on all clickables
- [ ] `prefers-reduced-motion` respected; no autoplay media
- [ ] Tables: `overflow-x-auto`, header `scope`, caption/`aria` where useful
- [ ] Responsive at 375 / 768 / 1024 / 1440; no horizontal page scroll on mobile
- [ ] Dark mode verified (borders & muted text visible in both themes)

## 7. Anti-patterns (do NOT use)

- ❌ Display serifs / luxury brochure fonts (Cinzel, Josefin, Playfair) — this is a tool
- ❌ Landing-page "conversion" patterns inside the app
- ❌ Emojis as icons (use Lucide SVG)
- ❌ Shadow-heavy "card soup" — prefer borders; reserve shadow for floating layers
- ❌ Colour-only status; low-contrast slate-400 body text in light mode
- ❌ Layout-shifting hover scales; instant (un-transitioned) state changes
- ❌ Proportional figures in data columns (use `tabular-nums` mono)
- ❌ Full-width form fields stretched across the whole screen (cap at `max-w-3xl`)
