// Centralised KYC env access. Mirrors lib/maps/config.ts: every KYC feature reads
// from here and fails soft when a key is absent, so the app keeps working (with a
// "not configured" notice) before the keys are set in Vercel.

/** Companies House Public Data API — free key from
 *  https://developer.company-information.service.gov.uk. Server-only (HTTP Basic
 *  auth, key as username). NEVER prefix with NEXT_PUBLIC. */
export const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY ?? "";

/** Base URL for the Companies House Public Data API. */
export const COMPANIES_HOUSE_API_BASE =
  "https://api.company-information.service.gov.uk";

/** OFSI / UK Sanctions List — free consolidated list (no key). */
export const OFSI_CONSOLIDATED_LIST_URL =
  process.env.OFSI_CONSOLIDATED_LIST_URL ??
  "https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv";

/** Didit — OPTIONAL, paid KYB/AML provider ($2/company). Leave blank to disable;
 *  the free official sources (Companies House + OFSI + VAT) remain the source of
 *  truth. Server-only. */
export const DIDIT_API_KEY = process.env.DIDIT_API_KEY ?? "";
export const DIDIT_API_URL =
  process.env.DIDIT_API_URL ?? "https://verification.didit.me";

/** True once the Companies House key is present (gates the core report). */
export const isKycConfigured = Boolean(COMPANIES_HOUSE_API_KEY);

/** True once a Didit key is present (gates the optional paid KYB/AML provider). */
export const isDiditConfigured = Boolean(DIDIT_API_KEY);

// The UI already shows a "not configured" notice, but that's easy to miss during
// deployment — surface it once in server logs too.
if (!COMPANIES_HOUSE_API_KEY) {
  console.warn(
    "[config] COMPANIES_HOUSE_API_KEY is not set — KYC reports will run without company/officer/PSC data.",
  );
}
