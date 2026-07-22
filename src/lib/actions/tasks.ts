"use server";

import { revalidatePath } from "next/cache";

import { currentAgencyId } from "@/lib/supabase/agency";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/actions/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Create a task and notify the assignee (if someone else was assigned). */
export async function createTask(
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

  const title = str(formData, "title");
  if (!title) return { error: "A task title is required." };
  const details = str(formData, "details") || null;
  const dueAt = str(formData, "due_at");
  const assigneeId = str(formData, "assignee_id") || null;

  const { error } = await supabase.from("tasks").insert({
    agency_id: agencyId,
    title,
    details,
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    assignee_id: assigneeId,
    created_by: user.id,
  });
  if (error) return { error: error.message };

  // Notify the assignee (if someone else was given the task).
  if (assigneeId && assigneeId !== user.id) {
    await supabase.from("notifications").insert({
      agency_id: agencyId,
      user_id: assigneeId,
      title: `New task assigned: “${title}”`,
      body: dueAt
        ? `Due ${new Date(dueAt).toLocaleString("en-GB")}`
        : (details ?? null),
      link: "/tasks",
    });
  }

  revalidatePath("/tasks");
  return { message: "Task added." };
}

/**
 * Set a task's status by explicit intent ("mark_done" / "mark_open") — the
 * client submits the state it wants, never a negation of a stale current value.
 */
export async function toggleTaskStatus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = str(formData, "id");
  const intent = str(formData, "intent");
  if (!id || !agencyId) return;
  if (intent !== "mark_done" && intent !== "mark_open") return;
  await supabase
    .from("tasks")
    .update({ status: intent === "mark_done" ? "done" : "open" })
    .eq("id", id)
    .eq("agency_id", agencyId);
  revalidatePath("/tasks");
}

/** Delete a task. */
export async function deleteTask(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const agencyId = await currentAgencyId(supabase);
  const id = str(formData, "id");
  if (!id || !agencyId) return;
  await supabase.from("tasks").delete().eq("id", id).eq("agency_id", agencyId);
  revalidatePath("/tasks");
}
