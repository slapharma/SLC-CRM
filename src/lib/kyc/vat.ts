// Best-effort UK VAT number validation via HMRC's free "Check a UK VAT number"
// API. Fails soft: any error / non-OK response returns null (treated as "could
// not verify"), never a crash.

import type { VatResult } from "./types";

const HMRC_VAT_LOOKUP =
  "https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup";

/** Strip spaces and a leading "GB" country prefix; keep digits only. */
function cleanVrn(vat: string): string {
  return vat.replace(/[^0-9A-Za-z]/g, "").replace(/^GB/i, "");
}

export async function checkVat(vat: string): Promise<VatResult> {
  const vrn = cleanVrn(vat);
  if (!/^\d{9}(\d{3})?$/.test(vrn)) return null; // 9 or 12 digit VRN
  try {
    const res = await fetch(`${HMRC_VAT_LOOKUP}/${vrn}`, {
      headers: { Accept: "application/vnd.hmrc.2.0+json" },
      cache: "no-store",
    });
    if (!res.ok) {
      // 404 = HMRC has no record of this VRN → definitively invalid.
      if (res.status === 404) {
        return { vatNumber: vrn, valid: false, name: null, address: null };
      }
      return null; // 401/5xx etc. → unknown, surface as "could not verify"
    }
    const body = (await res.json()) as {
      target?: { name?: string; address?: { line1?: string; postcode?: string } };
    };
    const t = body.target;
    const address = t?.address
      ? [t.address.line1, t.address.postcode].filter(Boolean).join(", ") || null
      : null;
    return { vatNumber: vrn, valid: true, name: t?.name ?? null, address };
  } catch {
    return null;
  }
}
