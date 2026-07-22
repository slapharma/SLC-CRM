"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Allowlist for message/notification links: app-relative paths into known
 * sections only. Anything else (external URLs, protocol-relative //host,
 * javascript: …) is dropped so a member can't send teammates a button that
 * leaves the app.
 */
const APP_LINK_RE =
  /^\/(deals|listings|requirements|companies|contacts|messages|kyc|matches|tasks)(\/|$)/;

/**
 * "Send to team" — deliver an internal message to one or more agency members and
 * ping each recipient's notification bell. `link` points back at the record the
 * message is about. Optionally threads under `parent_id` (a reply).
 */
export async function sendMessage(
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

  const recipients = Array.from(
    new Set(formData.getAll("recipients").map((v) => String(v)).filter(Boolean)),
  ).filter((id) => id !== user.id);
  if (recipients.length === 0) return { error: "Pick at least one teammate." };

  const body = str(formData, "body");
  if (!body) return { error: "Write a short message." };
  const subject = str(formData, "subject") || null;
  const rawLink = str(formData, "link");
  const link = rawLink && APP_LINK_RE.test(rawLink) ? rawLink : null;

  // Optional threading: only accept a parent the sender can actually see
  // (RLS scopes messages to sender/recipient, so a stray id resolves to null).
  const rawParentId = str(formData, "parent_id");
  let parentId: string | null = null;
  if (rawParentId) {
    const { data: parent } = await supabase
      .from("messages")
      .select("id")
      .eq("id", rawParentId)
      .maybeSingle();
    parentId = parent?.id ?? null;
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const senderName = me?.full_name ?? me?.email ?? "A teammate";

  const { error } = await supabase.from("messages").insert(
    recipients.map((recipient_id) => ({
      agency_id: agencyId,
      sender_id: user.id,
      recipient_id,
      subject,
      body,
      link,
      parent_id: parentId,
    })),
  );
  if (error) return { error: error.message };

  // Ping the existing notification bell for each recipient.
  const { error: noteError } = await supabase.from("notifications").insert(
    recipients.map((recipient_id) => ({
      agency_id: agencyId,
      user_id: recipient_id,
      title: `New message from ${senderName}`,
      body: subject ?? body.slice(0, 120),
      link: link ?? "/messages",
    })),
  );

  revalidatePath("/messages");
  return {
    message:
      `Sent to ${recipients.length} teammate${recipients.length === 1 ? "" : "s"}.` +
      (noteError ? ` (Bell notification failed: ${noteError.message})` : ""),
  };
}

/**
 * Mark one received message as read. The `recipient_id` filter is
 * defence-in-depth — RLS already restricts this, but scoping the query means a
 * tampered id simply matches nothing instead of relying on the policy alone.
 */
export async function markMessageRead(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("id") ?? "");
  if (id && user) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("recipient_id", user.id);
    revalidatePath("/messages");
  }
}

/** Mark one notification as read (used by the My Messages page). */
export async function markNotificationRead(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("id") ?? "");
  if (id && user) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    revalidatePath("/messages");
  }
}

/**
 * Delete one message from your own view. Either party may delete (migration
 * 0019), so this removes the row for both — matching how the inbox presents it
 * as "delete this message", not "hide it from me".
 */
export async function deleteMessage(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = String(formData.get("id") ?? "");
  if (!id || !user) return;
  await supabase
    .from("messages")
    .delete()
    .eq("id", id)
    .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`);
  revalidatePath("/messages");
}
