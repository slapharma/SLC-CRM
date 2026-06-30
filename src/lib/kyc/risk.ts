// Risk scoring — a small, transparent rules engine over the normalised report.
// Returns an overall rating plus human-readable flags shown in the report. Kept
// deliberately conservative: sanctions hits and insolvency dominate; bookkeeping
// lapses (overdue filings) are medium; healthy active companies are low.

import type { KycRisk, KycReportData } from "./types";

const SEVERITY: Record<KycRisk, number> = { unknown: 0, low: 1, medium: 2, high: 3 };
const worse = (a: KycRisk, b: KycRisk): KycRisk =>
  SEVERITY[a] >= SEVERITY[b] ? a : b;

const DISSOLVED = /dissolved/i;
const INSOLVENT = /liquidation|administration|receivership|insolvency|voluntary-arrangement/i;

export function scoreRisk(
  data: Omit<KycReportData, "riskRating" | "flags">,
): { riskRating: KycRisk; flags: string[] } {
  const flags: string[] = [];
  let risk: KycRisk = "low";

  const { profile } = data;

  if (!profile) {
    // No Companies House record means we can't assess the core entity.
    flags.push("No Companies House record linked — identity unverified.");
    risk = "unknown";
  } else {
    const status = (profile.status ?? "").toLowerCase();
    if (DISSOLVED.test(status)) {
      flags.push("Company is dissolved.");
      risk = worse(risk, "high");
    } else if (INSOLVENT.test(status)) {
      flags.push(`Company status: ${profile.status}.`);
      risk = worse(risk, "high");
    } else if (status && status !== "active") {
      flags.push(`Company status: ${profile.status}.`);
      risk = worse(risk, "medium");
    }

    if (profile.accountsOverdue) {
      flags.push("Annual accounts are overdue.");
      risk = worse(risk, "medium");
    }
    if (profile.confirmationStatementOverdue) {
      flags.push("Confirmation statement is overdue.");
      risk = worse(risk, "medium");
    }
  }

  if (data.insolvencyCases > 0) {
    flags.push(`${data.insolvencyCases} insolvency case(s) on record.`);
    risk = worse(risk, "high");
  }

  const outstanding = data.charges.filter(
    (c) => (c.status ?? "").toLowerCase() !== "satisfied",
  ).length;
  if (outstanding > 0) {
    flags.push(`${outstanding} outstanding charge(s) / mortgage(s) registered.`);
    risk = worse(risk, "medium");
  }

  if (data.sanctions.length > 0) {
    flags.push(
      `${data.sanctions.length} potential sanctions match(es) — manual review required.`,
    );
    risk = worse(risk, "high");
  }

  if (data.pscs.filter((p) => !p.ceasedOn).length === 0 && profile) {
    flags.push("No active Persons with Significant Control listed.");
  }

  if (data.vat && data.vat.valid === false) {
    flags.push("Supplied VAT number is not valid.");
    risk = worse(risk, "medium");
  }

  return { riskRating: risk, flags };
}
