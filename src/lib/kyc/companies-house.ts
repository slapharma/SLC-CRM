// Companies House Public Data API client. Free; HTTP Basic auth with the API key
// as the username and an empty password. Every call fails soft (returns null /
// []) so a missing key, a 404, or a network blip never crashes a report.

import {
  COMPANIES_HOUSE_API_BASE,
  COMPANIES_HOUSE_API_KEY,
  isKycConfigured,
} from "./config";
import type {
  ChCharge,
  ChOfficer,
  ChProfile,
  ChPsc,
  CompanySearchHit,
} from "./types";

function authHeader(): string {
  const token = Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString("base64");
  return `Basic ${token}`;
}

async function chFetch<T>(path: string): Promise<T | null> {
  if (!isKycConfigured) return null;
  try {
    const res = await fetch(`${COMPANIES_HOUSE_API_BASE}${path}`, {
      headers: { Authorization: authHeader(), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null; // 404 = no such record / resource → fail soft
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function addressToString(a: Record<string, unknown> | null | undefined): string | null {
  if (!a) return null;
  const parts = [
    a.premises,
    a.address_line_1,
    a.address_line_2,
    a.locality,
    a.region,
    a.postal_code,
    a.country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Companies House name search — powers the CRN picker. */
export async function searchCompanies(q: string): Promise<CompanySearchHit[]> {
  const query = q.trim();
  if (!query) return [];
  const raw = await chFetch<{ items?: Record<string, unknown>[] }>(
    `/search/companies?q=${encodeURIComponent(query)}&items_per_page=20`,
  );
  return (raw?.items ?? []).map((it) => ({
    companyNumber: String(it.company_number ?? ""),
    title: String(it.title ?? ""),
    status: typeof it.company_status === "string" ? it.company_status : null,
    address:
      typeof it.address_snippet === "string"
        ? it.address_snippet
        : addressToString(it.address as Record<string, unknown>),
    type: typeof it.company_type === "string" ? it.company_type : null,
  }));
}

/** Company profile — the headline record. */
export async function getProfile(num: string): Promise<ChProfile | null> {
  const raw = await chFetch<Record<string, unknown>>(`/company/${encodeURIComponent(num)}`);
  if (!raw) return null;
  const accounts = (raw.accounts as Record<string, unknown>) ?? {};
  const accountsNext = (accounts.next_accounts as Record<string, unknown>) ?? {};
  const cs = (raw.confirmation_statement as Record<string, unknown>) ?? {};
  return {
    companyNumber: String(raw.company_number ?? num),
    name: String(raw.company_name ?? ""),
    status: typeof raw.company_status === "string" ? raw.company_status : null,
    statusDetail:
      typeof raw.company_status_detail === "string" ? raw.company_status_detail : null,
    type: typeof raw.type === "string" ? raw.type : null,
    incorporatedOn:
      typeof raw.date_of_creation === "string" ? raw.date_of_creation : null,
    dissolvedOn:
      typeof raw.date_of_cessation === "string" ? raw.date_of_cessation : null,
    sicCodes: Array.isArray(raw.sic_codes) ? (raw.sic_codes as string[]) : [],
    registeredOffice: addressToString(
      raw.registered_office_address as Record<string, unknown>,
    ),
    accountsOverdue: accountsNext.overdue === true,
    accountsNextDue:
      typeof accountsNext.due_on === "string" ? accountsNext.due_on : null,
    confirmationStatementOverdue: cs.overdue === true,
    confirmationStatementNextDue:
      typeof cs.next_due === "string" ? cs.next_due : null,
  };
}

/** Officers (directors + secretaries). */
export async function getOfficers(num: string): Promise<ChOfficer[]> {
  const raw = await chFetch<{ items?: Record<string, unknown>[] }>(
    `/company/${encodeURIComponent(num)}/officers?items_per_page=50`,
  );
  return (raw?.items ?? []).map((it) => ({
    name: String(it.name ?? ""),
    role: typeof it.officer_role === "string" ? it.officer_role : null,
    appointedOn: typeof it.appointed_on === "string" ? it.appointed_on : null,
    resignedOn: typeof it.resigned_on === "string" ? it.resigned_on : null,
    nationality: typeof it.nationality === "string" ? it.nationality : null,
    occupation: typeof it.occupation === "string" ? it.occupation : null,
  }));
}

/** Persons with Significant Control (beneficial owners). */
export async function getPsc(num: string): Promise<ChPsc[]> {
  const raw = await chFetch<{ items?: Record<string, unknown>[] }>(
    `/company/${encodeURIComponent(num)}/persons-with-significant-control?items_per_page=50`,
  );
  return (raw?.items ?? []).map((it) => ({
    name: String(it.name ?? ""),
    kind: typeof it.kind === "string" ? it.kind : null,
    naturesOfControl: Array.isArray(it.natures_of_control)
      ? (it.natures_of_control as string[])
      : [],
    notifiedOn: typeof it.notified_on === "string" ? it.notified_on : null,
    ceasedOn: typeof it.ceased_on === "string" ? it.ceased_on : null,
  }));
}

/** Registered charges / mortgages. */
export async function getCharges(num: string): Promise<ChCharge[]> {
  const raw = await chFetch<{ items?: Record<string, unknown>[] }>(
    `/company/${encodeURIComponent(num)}/charges?items_per_page=50`,
  );
  return (raw?.items ?? []).map((it) => ({
    status: typeof it.status === "string" ? it.status : null,
    classification:
      typeof (it.classification as Record<string, unknown>)?.description === "string"
        ? String((it.classification as Record<string, unknown>).description)
        : null,
    created: typeof it.created_on === "string" ? it.created_on : null,
  }));
}

/** Number of insolvency cases on record (0 when none / endpoint 404s). */
export async function getInsolvencyCount(num: string): Promise<number> {
  const raw = await chFetch<{ cases?: unknown[] }>(
    `/company/${encodeURIComponent(num)}/insolvency`,
  );
  return Array.isArray(raw?.cases) ? raw!.cases.length : 0;
}
