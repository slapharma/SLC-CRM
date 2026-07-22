"use server";

import { redirect } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/service";
import type { FormState } from "@/lib/actions/types";

// The CDG agent who owns every publicly-submitted requirement, plus the
// CliftonAi admin who is cc'd on the notification. Both resolved by email at
// submit time (no hardcoded UUIDs).
const DEFAULT_AGENT_EMAIL = "morris@cdgleisure.com";
const ADMIN_EMAIL = "cliftonflack@gmail.com";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const commaArr = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Public requirement intake — no session. Writes via the service-role client
 * into the default CDG agent's agency, then pings the agent (and the admin)
 * through the in-app notification bell.
 */
export async function submitPublicRequirement(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Honeypot: real users never fill the invisible "website" field. Pretend
  // success so bots don't learn they were caught.
  if (str(formData, "website")) redirect("/submit-requirement/thank-you");

  // Bots submit instantly; humans take longer than 3 seconds.
  const renderedAt = Number(str(formData, "rendered_at"));
  if (Number.isFinite(renderedAt) && Date.now() - renderedAt < 3_000) {
    return { error: "Please take a moment to review your details, then resubmit." };
  }

  const companyName = str(formData, "company_name");
  const firstName = str(formData, "first_name");
  const lastName = str(formData, "last_name");
  const email = str(formData, "email");
  const phone = str(formData, "phone");
  if (!companyName) return { error: "Your company / brand name is required." };
  if (!firstName) return { error: "Your name is required." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "A valid email address is required." };
  }

  const propertyType = str(formData, "property_type");
  const towns = commaArr(str(formData, "target_towns"));
  const notes = str(formData, "notes");

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      error:
        "Submissions are temporarily unavailable — please email your requirement instead.",
    };
  }

  // Resolve the default agent → their user id + agency (the target tenant).
  const { data: agentProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", DEFAULT_AGENT_EMAIL)
    .maybeSingle();
  if (!agentProfile) {
    return {
      error:
        "Submissions are temporarily unavailable — please email your requirement instead.",
    };
  }
  const { data: membership } = await supabase
    .from("agency_members")
    .select("agency_id")
    .eq("user_id", agentProfile.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return {
      error:
        "Submissions are temporarily unavailable — please email your requirement instead.",
    };
  }
  const agencyId = membership.agency_id;
  const agentId = agentProfile.id;

  // Find-or-create the operator company (by name, within the agency).
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("name", companyName)
    .limit(1)
    .maybeSingle();
  let companyId = existingCompany?.id ?? null;
  if (!companyId) {
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        agency_id: agencyId,
        name: companyName,
        type: "operator",
        created_by: agentId,
      })
      .select("id")
      .single();
    if (companyError) return { error: "Something went wrong — please try again." };
    companyId = newCompany.id;
  }

  // Find-or-create the submitting contact (by email, within the agency).
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  let contactId = existingContact?.id ?? null;
  if (!contactId) {
    const { data: newContact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        agency_id: agencyId,
        company_id: companyId,
        first_name: firstName,
        last_name: lastName || null,
        email,
        phone: phone || null,
      })
      .select("id")
      .single();
    if (contactError) return { error: "Something went wrong — please try again." };
    contactId = newContact.id;
  }

  const title = `${companyName} — ${propertyType || "property"} requirement`;
  const { data: requirement, error: reqError } = await supabase
    .from("requirements")
    .insert({
      agency_id: agencyId,
      created_by: agentId,
      lead_agent_id: agentId,
      company_id: companyId,
      contact_id: contactId,
      title,
      status: "active",
      target_towns: towns,
      property_types: propertyType ? [propertyType] : [],
      min_sqft: num(formData, "min_sqft"),
      max_sqft: num(formData, "max_sqft"),
      min_covers: num(formData, "min_covers"),
      max_covers: num(formData, "max_covers"),
      max_rent: num(formData, "max_rent"),
      max_premium: num(formData, "max_premium"),
      notes: [
        notes || null,
        `Submitted via the public requirement form by ${firstName} ${lastName}`.trim() +
          ` (${email}${phone ? `, ${phone}` : ""}).`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    })
    .select("id")
    .single();
  if (reqError) return { error: "Something went wrong — please try again." };

  // Ping the default agent's bell, and the CliftonAi admin's (best-effort).
  const recipients = [agentId];
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();
  if (adminProfile && adminProfile.id !== agentId) recipients.push(adminProfile.id);

  await supabase.from("notifications").insert(
    recipients.map((user_id) => ({
      agency_id: agencyId,
      user_id,
      title: "New property requirement submitted",
      body: `${title} — from ${firstName} ${lastName} (${email})`.trim(),
      link: `/requirements/${requirement.id}`,
    })),
  );

  redirect("/submit-requirement/thank-you");
}
