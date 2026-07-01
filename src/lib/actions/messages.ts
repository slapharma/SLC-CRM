"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * "Send to team" — deliver an internal message to one or more agency members and
 * ping each recipient's notification bell. `link` points back at the record the
 * message is about.
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
  const link = str(formData, "link") || null;

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
    })),
  );
  if (error) return { error: error.message };

  // Ping the existing notification bell for each recipient.
  await supabase.from("notifications").insert(
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
    message: `Sent to ${recipients.length} teammate${recipients.length === 1 ? "" : "s"}.`,
  };
}

/** Mark one received message as read. */
export async function markMessageRead(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath("/messages");
  }
}

/** Mark one notification as read (used by the My Messages page). */
export async function markNotificationRead(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath("/messages");
  }
}
