import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Clock, Inbox } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { markMessageRead, markNotificationRead } from "@/lib/actions/messages";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Messages" };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB");

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: msgs }, { data: notes }, { data: reminders }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, subject, body, link, read_at, created_at")
      .eq("recipient_id", user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("deal_reminders")
      .select("id, title, due_at, deal_id")
      .eq("done", false)
      .order("due_at", { ascending: true })
      .limit(30),
  ]);

  const messages = msgs ?? [];
  const notifications = notes ?? [];
  const dueReminders = reminders ?? [];

  // Sender display names for the inbox.
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const nameOf = new Map<string, string>();
  if (senderIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", senderIds);
    (profs ?? []).forEach((p) => nameOf.set(p.id, p.full_name ?? p.email ?? "Teammate"));
  }

  const unreadInbox = messages.filter((m) => !m.read_at).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">My Messages</h1>
        <p className="text-sm text-muted-foreground">
          Team messages, notifications and reminders in one place.
        </p>
      </div>

      {/* ── Inbox ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            Inbox
          </CardTitle>
          {unreadInbox > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {unreadInbox} unread
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages yet. Use “Send to team” on any record to message a colleague.
            </p>
          ) : (
            <ul className="divide-y">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "flex items-start justify-between gap-3 py-3",
                    !m.read_at && "-mx-2 rounded-md bg-primary/5 px-2",
                  )}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">
                        {nameOf.get(m.sender_id) ?? "Teammate"}
                      </span>
                      {m.subject ? (
                        <span className="text-muted-foreground"> · {m.subject}</span>
                      ) : null}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {m.body}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{fmt(m.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.link ? (
                      <Link
                        href={m.link}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        Open
                      </Link>
                    ) : null}
                    {!m.read_at ? (
                      <form action={markMessageRead}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Mark read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Notifications ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start justify-between gap-3 py-3",
                    !n.read_at && "-mx-2 rounded-md bg-primary/5 px-2",
                  )}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body ? (
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">{fmt(n.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {n.link ? (
                      <Link
                        href={n.link}
                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                      >
                        Open
                      </Link>
                    ) : null}
                    {!n.read_at ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={n.id} />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Mark read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Reminders ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dueReminders.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No open reminders"
              description="Reminders you set on a deal appear here until they're marked done."
            />
          ) : (
            <ul className="divide-y">
              {dueReminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Due {fmt(r.due_at)}
                    </p>
                  </div>
                  <Link
                    href={`/deals/${r.deal_id}`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    Open deal
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
