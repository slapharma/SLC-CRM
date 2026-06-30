// Normalised KYC report shapes. Provider modules (companies-house, sanctions, vat)
// map their raw API responses into these; report.ts assembles the full
// KycReportData, scores risk, and persists it to kyc_reports.payload. The report
// view renders entirely from KycReportData, so it never touches raw API JSON.

export type KycRisk = "low" | "medium" | "high" | "unknown";

/** Companies House company profile (the headline record). */
export type ChProfile = {
  companyNumber: string;
  name: string;
  /** e.g. "active", "dissolved", "liquidation", "administration". */
  status: string | null;
  statusDetail: string | null;
  type: string | null;
  incorporatedOn: string | null;
  dissolvedOn: string | null;
  sicCodes: string[];
  registeredOffice: string | null;
  accountsOverdue: boolean;
  accountsNextDue: string | null;
  confirmationStatementOverdue: boolean;
  confirmationStatementNextDue: string | null;
};

/** A director / secretary appointment. */
export type ChOfficer = {
  name: string;
  role: string | null;
  appointedOn: string | null;
  resignedOn: string | null;
  nationality: string | null;
  occupation: string | null;
};

/** A Person with Significant Control (beneficial owner). */
export type ChPsc = {
  name: string;
  kind: string | null;
  naturesOfControl: string[];
  notifiedOn: string | null;
  ceasedOn: string | null;
};

/** A registered charge / mortgage. */
export type ChCharge = {
  status: string | null;
  classification: string | null;
  created: string | null;
};

/** A potential sanctions-list hit — always treated as "requires manual review". */
export type SanctionsMatch = {
  /** The name we screened (company / officer / PSC). */
  query: string;
  matchedName: string;
  /** The regime / list the match came from. */
  listName: string;
  /** 0..1 confidence of the name match (not of guilt). */
  score: number;
};

/** Result of a VAT-number validation (null when no number / not checked). */
export type VatResult = {
  vatNumber: string;
  valid: boolean;
  name: string | null;
  address: string | null;
} | null;

/** Compact headline stored in kyc_reports.summary for list/card views. */
export type KycSummary = {
  companyNumber: string | null;
  companyName: string | null;
  status: string | null;
  incorporatedOn: string | null;
  officersActive: number;
  pscCount: number;
  chargesOutstanding: number;
  insolvencyCases: number;
  sanctionsHits: number;
  accountsOverdue: boolean;
  confirmationStatementOverdue: boolean;
  vatValid: boolean | null;
};

/** Full normalised report — stored in kyc_reports.payload. */
export type KycReportData = {
  profile: ChProfile | null;
  officers: ChOfficer[];
  pscs: ChPsc[];
  charges: ChCharge[];
  insolvencyCases: number;
  sanctions: SanctionsMatch[];
  vat: VatResult;
  summary: KycSummary;
  riskRating: KycRisk;
  flags: string[];
  /** Providers that actually ran, e.g. ["companies_house", "ofsi_sanctions"]. */
  sources: string[];
  /** Soft warnings (e.g. "Companies House not configured"). */
  notices: string[];
};

/** A Companies House name-search hit (for the CRN picker). */
export type CompanySearchHit = {
  companyNumber: string;
  title: string;
  status: string | null;
  address: string | null;
  type: string | null;
};
