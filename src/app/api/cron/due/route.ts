import { NextResponse } from "next/server";
import { Resend } from "resend";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/cron/due — fires notifications (and optional emails) for deal
 * reminders and tasks whose due date has passed. Invoked by Vercel Cron every
 * 15 minutes (see vercel.json); Vercel sends `Authorization: Bearer CRON_SECRET`
 * automatically when the env var is set. Each row fires exactly once — the
 * `notified_at` stamp is only written after its notification insert succeeds,
 * so transient failures retry on the next run.
 */

const ENTITY_PATHS: Record<string, string> = {
  deal: "/deals",
  listing: "/listings",
  requirement: "/requirements",
  company: "/companies",
  contact: "/contacts",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB");

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured." },
      { status: 503 },
    );
  }

  const nowIso = new Date().toISOString();
  // recipient → plain-text lines, flushed as one email per person at the end.
  const emailLines = new Map<string, string[]>();
  let firedReminders = 0;
  let firedTasks = 0;

  // ── Deal reminders ─────────────────────────────────────────────────────────
  const { data: dueReminders } = await supabase
    .from("deal_reminders")
    .select("id, agency_id, deal_id, title, due_at, created_by")
    .eq("done", false)
    .is("notified_at", null)
    .lte("due_at", nowIso)
    .limit(100);

  const reminderRows = dueReminders ?? [];
  const dealIds = [...new Set(reminderRows.map((r) => r.deal_id))];
  const dealOf = new Map<
    string,
    { title: string; lead_agent_id: string | null; created_by: string | null }
  >();
  if (dealIds.length) {
    const { data: deals } = await supabase
      .from("deals")
      .select("id, title, lead_agent_id, created_by")
      .in("id", dealIds);
    (deals ?? []).forEach((d) => dealOf.set(d.id, d));
  }

  for (const r of reminderRows) {
    const deal = dealOf.get(r.deal_id);
    const recipient =
      deal?.lead_agent_id ?? deal?.created_by ?? r.created_by ?? null;
    if (!recipient) {
      // Nobody to tell — stamp it so it doesn't churn every run.
      await supabase
        .from("deal_reminders")
        .update({ notified_at: nowIso })
        .eq("id", r.id);
      continue;
    }
    const { error } = await supabase.from("notifications").insert({
      agency_id: r.agency_id,
      user_id: recipient,
      title: `Reminder due: ${r.title}`,
      body: deal
        ? `On “${deal.title}” — due ${fmt(r.due_at)}`
        : `Due ${fmt(r.due_at)}`,
      link: `/deals/${r.deal_id}`,
    });
    if (error) continue; // retry next run
    await supabase
      .from("deal_reminders")
      .update({ notified_at: nowIso })
      .eq("id", r.id);
    firedReminders += 1;
    const lines = emailLines.get(recipient) ?? [];
    lines.push(
      `• Reminder due: ${r.title}${deal ? ` (deal “${deal.title}”)` : ""} — was due ${fmt(r.due_at)}`,
    );
    emailLines.set(recipient, lines);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const { data: dueTasks } = await supabase
    .from("tasks")
    .select(
      "id, agency_id, title, due_at, assignee_id, created_by, entity_type, entity_id",
    )
    .eq("status", "open")
    .is("notified_at", null)
    .not("due_at", "is", null)
    .lte("due_at", nowIso)
    .limit(100);

  for (const t of dueTasks ?? []) {
    const recipient = t.assignee_id ?? t.created_by ?? null;
    if (!recipient) {
      await supabase.from("tasks").update({ notified_at: nowIso }).eq("id", t.id);
      continue;
    }
    const link =
      t.entity_type && t.entity_id && ENTITY_PATHS[t.entity_type]
        ? `${ENTITY_PATHS[t.entity_type]}/${t.entity_id}`
        : "/tasks";
    const { error } = await supabase.from("notifications").insert({
      agency_id: t.agency_id,
      user_id: recipient,
      title: `Task due: ${t.title}`,
      body: t.due_at ? `Due ${fmt(t.due_at)}` : null,
      link,
    });
    if (error) continue; // retry next run
    await supabase.from("tasks").update({ notified_at: nowIso }).eq("id", t.id);
    firedTasks += 1;
    const lines = emailLines.get(recipient) ?? [];
    lines.push(`• Task due: ${t.title}${t.due_at ? ` — was due ${fmt(t.due_at)}` : ""}`);
    emailLines.set(recipient, lines);
  }

  // ── Optional email digest (best-effort, failures non-fatal) ────────────────
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let emailed = 0;
  if (apiKey && from && emailLines.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", [...emailLines.keys()]);
    const resend = new Resend(apiKey);
    for (const p of profiles ?? []) {
      const lines = emailLines.get(p.id);
      if (!lines || !p.email) continue;
      try {
        const { error } = await resend.emails.send({
          from,
          to: p.email,
          subject: `${lines.length} item${lines.length === 1 ? "" : "s"} due in the CRM`,
          text: [
            p.full_name ? `Hi ${p.full_name.split(" ")[0]},` : "Hi,",
            "",
            "The following items are now due:",
            "",
            ...lines,
            "",
            "Open My Messages in the CRM to review them.",
          ].join("\n"),
        });
        if (!error) emailed += 1;
      } catch {
        // Non-fatal — the in-app notification already landed.
      }
    }
  }

  return NextResponse.json({
    reminders: firedReminders,
    tasks: firedTasks,
    emailed,
  });
}
