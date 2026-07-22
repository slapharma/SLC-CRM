import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import type { Note } from "@/components/notifications-bell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// Every page in this group is auth-gated and reads the request's cookies via the
// Supabase server client, so none of them can be statically prerendered. Forcing
// dynamic rendering here (route segment config is inherited by all child segments)
// keeps `next build` from evaluating these pages at build time — which otherwise
// throws when NEXT_PUBLIC_SUPABASE_* env vars are absent (e.g. in CI).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string } | null = null;
  let isAdmin = false;
  let notifications: Note[] = [];
  let unreadMessages = 0;

  // Real auth boundary lives here (the proxy only does optimistic session refresh).
  // Before Supabase is provisioned we render a demo shell instead of locking people out.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user: authedUser },
    } = await supabase.auth.getUser();
    if (!authedUser) redirect("/login");
    user = { email: authedUser.email };

    // Scope to the caller's OWN membership — agency_members RLS can surface
    // co-members, so an unscoped role=admin check would leak the Admin nav to
    // any non-admin whose agency has an admin.
    const [{ data: adminRow }, { data: noteRows }, { count: unreadCount }] =
      await Promise.all([
        supabase
          .from("agency_members")
          .select("agency_id")
          .eq("user_id", authedUser.id)
          .eq("role", "admin")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id, title, body, link, read_at, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", authedUser.id)
          .is("read_at", null),
      ]);
    isAdmin = Boolean(adminRow);
    notifications = noteRows ?? [];
    unreadMessages = unreadCount ?? 0;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar isAdmin={isAdmin} unreadMessages={unreadMessages} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={user}
          demo={!isSupabaseConfigured}
          isAdmin={isAdmin}
          notifications={notifications}
        />
        <main className="flex-1 overflow-x-hidden p-6 text-sm">{children}</main>
      </div>
    </div>
  );
}
