// Didit provider — OPTIONAL, paid KYB/AML ($2/company). Didit's *free* tier is
// individuals-only (ID doc + liveness + face match), so it does NOT cover company
// KYC; the free official sources (Companies House + OFSI + VAT) are the source of
// truth. This module is wired but disabled until DIDIT_API_KEY is set, so it can
// be slotted in later without touching the report pipeline.

import { isDiditConfigured } from "../config";
import type { SanctionsMatch } from "../types";

export type KycProvider = {
  name: string;
  enabled: boolean;
  /** Company-level KYB/AML. Returns null when disabled (no-op). */
  screenBusiness(companyNumber: string): Promise<{ aml: SanctionsMatch[] } | null>;
};

export const diditProvider: KycProvider = {
  name: "didit",
  enabled: isDiditConfigured,
  async screenBusiness() {
    if (!isDiditConfigured) return null;
    // TODO: implement the paid call (POST /v3/workflows + /v3/session, or the KYB
    // endpoint) and map kyb_company_aml hits → SanctionsMatch[]. Intentionally a
    // no-op until then so no paid request is ever made by accident.
    return null;
  },
};
