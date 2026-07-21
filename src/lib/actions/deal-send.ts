"use server";

import { Resend } from "resend";

import { renderParticularsPdf } from "@/lib/pdf/build-particulars";
import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * "Send Deal → External" — email a matched opportunity (or a batch of
 * requirement briefs) to a company contact, attaching the listing particulars
 * PDF when a listing is involved (branded for CDG stock, unbranded for intel).
 * Every send is logged to `external_sends`.
 */
export async function sendDealExternal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const agencyId = await currentAgencyId(supabase);
  if (!agencyId) return { error: "No agency is linked to your account." };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return {
      error:
        "Email sending isn't configured yet — set RESEND_API_KEY and EMAIL_FROM.",
    };
  }

  const contactId = str(formData, "contact_id");
  if (!contactId) return { error: "Pick a contact to send to." };
  const companyId = str(formData, "company_id") || null;
  const listingId = str(formData, "listing_id") || null;
  const requirementIds = Array.from(
    new Set(formData.getAll("requirement_ids").map((v) => String(v)).filter(Boolean)),
  );
  const subject = str(formData, "subject");
  if (!subject) return { error: "A subject is required." };
  const body = str(formData, "body");

  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name, last_name, email")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return { error: "Contact not found." };
  if (!contact.email)
    return { error: "That contact has no email address — add one first." };

  // Attach the particulars PDF when a listing is part of the send.
  let attachment: { filename: string; content: Buffer } | null = null;
  let pdfKind: "branded" | "unbranded" | null = null;
  if (listingId) {
    const pdf = await renderParticularsPdf(listingId, supabase);
    if (!pdf) return { error: "Listing not found." };
    attachment = { filename: pdf.filename, content: pdf.buffer };
    pdfKind = pdf.isIntel ? "unbranded" : "branded";
  }

  // Requirement briefs (bulk mode) — summarised inline in the email body.
  let briefLines: string[] = [];
  if (requirementIds.length > 0) {
    const { data: reqRows } = await supabase
      .from("requirements")
      .select("id, title, target_towns, min_sqft, max_sqft, max_rent")
      .in("id", requirementIds);
    briefLines = (reqRows ?? []).map((r) => {
      const bits = [
        r.target_towns.length ? r.target_towns.join(", ") : null,
        r.min_sqft != null || r.max_sqft != null
          ? `${r.min_sqft?.toLocaleString("en-GB") ?? "?"}–${r.max_sqft?.toLocaleString("en-GB") ?? "?"} sq ft`
          : null,
        r.max_rent != null ? `max £${r.max_rent.toLocaleString("en-GB")} pa` : null,
      ].filter(Boolean);
      return `• ${r.title}${bits.length ? ` — ${bits.join(" · ")}` : ""}`;
    });
  }

  const greeting = contact.first_name ? `Hi ${contact.first_name},` : "Hi,";
  const text = [
    greeting,
    "",
    body || "Please find details below.",
    briefLines.length ? "" : null,
    briefLines.length ? briefLines.join("\n") : null,
    attachment ? "" : null,
    attachment ? "Full property particulars are attached." : null,
  ]
    .filter((l): l is string => l != null)
    .join("\n");

  // Replies should land with the sending agent, not the shared from-address.
  const { data: me } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const resend = new Resend(apiKey);
  const { data: sent, error: sendError } = await resend.emails.send({
    from,
    to: contact.email,
    replyTo: me?.email ?? undefined,
    subject,
    text,
    attachments: attachment
      ? [{ filename: attachment.filename, content: attachment.content }]
      : undefined,
  });
  if (sendError) return { error: `Email failed: ${sendError.message}` };

  // Log the send — one row per requirement when bulk, else a single row.
  const baseRow = {
    agency_id: agencyId,
    listing_id: listingId,
    company_id: companyId,
    contact_id: contactId,
    recipient_email: contact.email,
    subject,
    body: body || null,
    pdf_kind: pdfKind,
    provider_id: sent?.id ?? null,
    sent_by: user.id,
  };
  const rows = (requirementIds.length > 0 ? requirementIds : [null]).map(
    (requirement_id) => ({ ...baseRow, requirement_id }),
  );
  const { error: logError } = await supabase.from("external_sends").insert(rows);
  if (logError) {
    // The email is already out — surface success but note the logging failure.
    return { message: `Sent to ${contact.email} (logging failed: ${logError.message})` };
  }

  return { message: `Sent to ${contact.email}.` };
}
